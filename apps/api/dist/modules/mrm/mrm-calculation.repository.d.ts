import { DatabaseService } from '../../database/database.service';
import type { MrmMetricBucket, MrmSourceStatus } from './mrm.types';
export type MrmQueryExecutor = Pick<DatabaseService, 'query'>;
export type MrmEmployeeSourceRow = {
    range: string;
    org_unit: string;
    direct_or_indirect: string;
    employee_group: string;
    ps_group: string;
    gender_key: string;
    joined_in_month: boolean;
};
export type MrmAttritionSourceRow = {
    range: string;
    org_unit: string;
    filter_value: string;
    reason_for_action: string;
};
export declare class MrmCalculationRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getSourceStatus(dataMonth: string, executor?: MrmQueryExecutor): Promise<MrmSourceStatus>;
    getEmployees(dataMonth: string, accountId: string, source: 'live' | 'history', executor?: MrmQueryExecutor): Promise<MrmEmployeeSourceRow[]>;
    getAttrition(dataMonth: string, accountId: string, executor?: MrmQueryExecutor): Promise<MrmAttritionSourceRow[]>;
    getSnapshotBuckets(dataMonth: string, accountId: string, executor?: MrmQueryExecutor): Promise<MrmMetricBucket[]>;
    replaceMonthlySnapshot(dataMonth: string, accountId: string, buckets: MrmMetricBucket[], executor: MrmQueryExecutor): Promise<void>;
}
