import { Injectable } from '@nestjs/common';
import {
  classifySeparation,
  normalizedKey,
} from '../attrition/attrition-classification';
import {
  MrmCalculationRepository,
  type MrmQueryExecutor,
  type MrmAttritionSourceRow,
  type MrmEmployeeSourceRow,
} from './mrm-calculation.repository';
import type { MrmCalculation, MrmMetricBucket } from './mrm.types';

type MutableBucket = Omit<MrmMetricBucket, 'numerator' | 'denominator' | 'qualityCount'> & {
  numerator: number;
  denominator: number | null;
  qualityCount: number;
};

const indirectRanges = new Set(['BIDP', 'NAP', 'JAP', 'GANP']);
const sulGrades = new Set(['GROUP1', 'GROUP2', 'SL2', 'SL3', 'SL4']);

@Injectable()
export class MrmCalculationService {
  constructor(private readonly repository: MrmCalculationRepository) {}

  getSourceStatus(dataMonth: string, executor?: MrmQueryExecutor) {
    return this.repository.getSourceStatus(dataMonth, executor);
  }

  async calculate(
    dataMonth: string,
    accountId: string,
    executor?: MrmQueryExecutor,
  ): Promise<MrmCalculation> {
    const sourceStatus = await this.repository.getSourceStatus(dataMonth, executor);
    if (!sourceStatus.available || !sourceStatus.source) {
      return { sourceStatus, buckets: [] };
    }
    if (sourceStatus.source === 'snapshot') {
      return {
        sourceStatus,
        buckets: await this.repository.getSnapshotBuckets(dataMonth, accountId, executor),
      };
    }
    const [employees, attrition] = await Promise.all([
      this.repository.getEmployees(dataMonth, accountId, sourceStatus.source, executor),
      this.repository.getAttrition(dataMonth, accountId, executor),
    ]);
    return {
      sourceStatus,
      buckets: this.buildBuckets(dataMonth, employees, attrition),
    };
  }

  async archiveMonth(
    dataMonth: string,
    accountId: string,
    executor: MrmQueryExecutor,
  ): Promise<void> {
    const calculation = await this.calculate(dataMonth, accountId, executor);
    if (!calculation.sourceStatus.available || calculation.sourceStatus.source === 'snapshot') {
      throw new Error('MRM_SOURCE_MONTH_UNAVAILABLE');
    }
    await this.repository.replaceMonthlySnapshot(
      dataMonth,
      accountId,
      calculation.buckets,
      executor,
    );
  }

  private buildBuckets(
    dataMonth: string,
    employees: MrmEmployeeSourceRow[],
    attrition: MrmAttritionSourceRow[],
  ): MrmMetricBucket[] {
    const buckets = new Map<string, MutableBucket>();
    const add = (
      metricKey: string,
      range: string,
      orgUnit: string,
      numerator = 1,
      denominator: number | null = null,
      qualityCount = 0,
    ) => {
      const rangeKey = normalizedKey(range);
      const orgUnitKey = normalizedKey(orgUnit);
      const id = `${metricKey}\0${rangeKey}\0${orgUnitKey}`;
      const bucket = buckets.get(id) ?? {
        dataMonth,
        metricKey,
        rangeKey,
        orgUnitKey,
        numerator: 0,
        denominator: denominator === null ? null : 0,
        qualityCount: 0,
      };
      bucket.numerator += numerator;
      if (denominator !== null) bucket.denominator = (bucket.denominator ?? 0) + denominator;
      bucket.qualityCount += qualityCount;
      buckets.set(id, bucket);
    };

    employees.forEach((employee) => {
      const direct = normalizedKey(employee.direct_or_indirect);
      const range = normalizedKey(employee.range);
      const grade = normalizedKey(employee.ps_group);
      const gender = normalizedKey(employee.gender_key);
      const isMss = direct === 'D' || direct === 'I';
      if (direct === 'D') add('direct-mss', employee.range, employee.org_unit);
      if (isMss) add('total-mss', employee.range, employee.org_unit);
      if (direct === 'I' && indirectRanges.has(range)) {
        add('indirect-mss', employee.range, employee.org_unit);
      }
      if (normalizedKey(employee.employee_group) === 'INBOUND') {
        add('expat', employee.range, employee.org_unit);
      }
      if (sulGrades.has(grade)) add('sul', employee.range, employee.org_unit);
      if (sulGrades.has(grade) && gender === 'FEMALE') {
        add('women-slx', employee.range, employee.org_unit);
      }
      if (isMss) {
        add('women-hc', employee.range, employee.org_unit, gender === 'FEMALE' ? 1 : 0, 1);
      }
      if (employee.joined_in_month) {
        const recognized = gender === 'FEMALE' || gender === 'MALE';
        add(
          'gender-hiring',
          employee.range,
          employee.org_unit,
          gender === 'FEMALE' ? 1 : 0,
          recognized ? 1 : 0,
          recognized ? 0 : 1,
        );
      }
    });

    attrition.forEach((row) => {
      const separation = classifySeparation(row);
      const reason = normalizedKey(row.reason_for_action);
      if (
        separation === 'Resignation'
        || separation === 'Retirement'
        || reason === 'TRANSFER INTRA ENTITY'
      ) add('attrition', row.range, row.org_unit);
      if (reason === 'TRANSFER INTRA BOSCH') {
        add('rotation', row.range, row.org_unit);
      }
      if (reason === 'INTERNAL') add('transfer', row.range, row.org_unit);
    });

    return [...buckets.values()];
  }
}