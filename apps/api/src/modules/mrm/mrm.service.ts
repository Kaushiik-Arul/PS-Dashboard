import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MrmCalculationService } from './mrm-calculation.service';
import {
  MrmRepository,
  type MrmColumnRecord,
  type MrmRowDefinitionRecord,
} from './mrm.repository';
import type {
  MrmCalculation,
  MrmMetricBucket,
  MrmReportDocument,
  MrmSaveInput,
  MrmUploadedFile,
} from './mrm.types';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const keyPattern = /^[a-z0-9][a-z0-9-]{0,99}$/;
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNumber - 1]}'${String(year).slice(-2)}`;
}

@Injectable()
export class MrmService {
  constructor(
    private readonly repository: MrmRepository,
    private readonly calculations: MrmCalculationService,
  ) {}

  async listMonths() {
    const generatedMonth = currentMonth();
    const [reports, availableDataMonths] = await Promise.all([
      this.repository.listReports(),
      this.repository.listAvailableDataMonths(),
    ]);
    const monthsByReportingMonth = new Map(reports.map((report) => [report.reportingMonth, report]));
    monthsByReportingMonth.set(
      generatedMonth,
      monthsByReportingMonth.get(generatedMonth) ?? {
        reportingMonth: generatedMonth,
        dataMonth: shiftMonth(generatedMonth, -1),
        status: 'draft' as const,
      },
    );
    for (const dataMonth of availableDataMonths) {
      const reportingMonth = shiftMonth(dataMonth, 1);
      if (reportingMonth > generatedMonth || monthsByReportingMonth.has(reportingMonth)) continue;
      monthsByReportingMonth.set(reportingMonth, {
        reportingMonth,
        dataMonth,
        status: 'draft' as const,
      });
    }
    const months = [...monthsByReportingMonth.values()].sort((left, right) => (
      right.reportingMonth.localeCompare(left.reportingMonth)
    ));
    const statuses = await Promise.all(months.map(async (month) => ({
      ...month,
      sourceStatus: await this.calculations.getSourceStatus(month.dataMonth),
    })));
    return { currentMonth: generatedMonth, months: statuses };
  }

  async getReport(reportingMonth: string, user: AuthenticatedUser): Promise<MrmReportDocument> {
    this.assertMonth(reportingMonth);
    const report = await this.repository.getReport(reportingMonth);
    if (report?.status === 'finalized') {
      const snapshot = await this.repository.getSnapshot(report.id);
      if (!this.isDocument(snapshot)) throw new Error('MRM_SNAPSHOT_INVALID');
      const buckets = await this.repository.getScopedBuckets(report.id, user.accountId);
      return this.applyCalculatedValues({
        ...this.normalizeDocument(snapshot),
        canManage: false,
        updatedAt: report.updated_at,
        finalizedAt: report.finalized_at,
      }, buckets);
    }
    const dataMonth = shiftMonth(reportingMonth, -1);
    const [rows, columns, cells, attachments, calculations] = await Promise.all([
      this.repository.getRows(reportingMonth, report?.id ?? null),
      this.repository.getColumns(reportingMonth, report?.id ?? null),
      this.repository.getCells(report?.id ?? null),
      this.repository.getAttachments(report?.id ?? null),
      this.calculateRollingMonths(reportingMonth, user.accountId),
    ]);
    const latestCalculation = calculations.find((calculation) => (
      calculation.buckets.some((bucket) => bucket.dataMonth === dataMonth)
    )) ?? calculations[calculations.length - 1];
    const cellMap = new Map(cells.map((cell) => [`${cell.row_key}\0${cell.column_key}`, cell.value]));
    const document: MrmReportDocument = {
      schemaVersion: 1,
      reportingMonth,
      dataMonth,
      status: 'draft',
      revision: Number(report?.revision ?? 0),
      canManage: user.roles.includes('hrbp'),
      sourceStatus: latestCalculation?.sourceStatus ?? { available: false, source: null },
      columns: columns.map((column) => this.mapColumn(column, reportingMonth)),
      rows: rows.map((row) => this.mapRow(row, columns, cellMap)),
      attachments,
      updatedAt: report?.updated_at ?? null,
      finalizedAt: null,
    };
    return this.applyCalculatedValues(
      document,
      calculations.flatMap((calculation) => calculation.buckets),
    );
  }

  async saveReport(reportingMonth: string, user: AuthenticatedUser, body: unknown) {
    this.assertMonth(reportingMonth);
    const input = this.parseSaveInput(body);
    await this.repository.saveDraft(reportingMonth, user.accountId, input);
    return this.getReport(reportingMonth, user);
  }

  async finalize(reportingMonth: string, user: AuthenticatedUser, expectedRevision: unknown) {
    this.assertMonth(reportingMonth);
    if (!Number.isInteger(expectedRevision) || Number(expectedRevision) < 0) {
      throw new BadRequestException('Expected revision is invalid.');
    }
    let document = await this.getReport(reportingMonth, user);
    if (document.status === 'finalized') return document;
    if (!document.sourceStatus.available) {
      throw new BadRequestException('The MRM source month is unavailable.');
    }
    if (document.revision === 0) {
      const input = this.documentToSave(document, 0);
      await this.repository.saveDraft(reportingMonth, user.accountId, input);
      document = await this.getReport(reportingMonth, user);
    } else if (document.revision !== Number(expectedRevision)) {
      throw new ConflictException('Expected revision does not match the loaded report.');
    }
    const report = await this.repository.getReport(reportingMonth);
    if (!report) throw new NotFoundException('MRM report not found.');
    const calculations = await this.calculateRollingMonths(reportingMonth, user.accountId);
    const latestCalculation = calculations[calculations.length - 1];
    if (!latestCalculation?.sourceStatus.available) {
      throw new BadRequestException('The MRM source month is unavailable.');
    }
    await this.repository.finalize(
      report.id,
      user.accountId,
      document.revision,
      calculations.flatMap((calculation) => calculation.buckets),
      document,
    );
    return this.getReport(reportingMonth, user);
  }

  async uploadAttachment(
    reportingMonth: string,
    user: AuthenticatedUser,
    rowKey: unknown,
    columnKey: unknown,
    file: MrmUploadedFile | undefined,
  ) {
    this.assertMonth(reportingMonth);
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Attachment file is required.');
    if (typeof rowKey !== 'string' || !keyPattern.test(rowKey)
      || typeof columnKey !== 'string' || !keyPattern.test(columnKey)) {
      throw new BadRequestException('Attachment target is invalid.');
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Attachment must be between 1 byte and 10 MB.');
    }
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Attachment type is not supported.');
    }
    const report = await this.repository.getReport(reportingMonth);
    if (!report) throw new NotFoundException('Save the MRM draft before attaching files.');
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'attachment';
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    await this.repository.addAttachment(
      report.id, rowKey, columnKey, user.accountId, file, safeFilename, sha256,
    );
    return this.getReport(reportingMonth, user);
  }

  async downloadAttachment(reportingMonth: string, attachmentId: string, user: AuthenticatedUser) {
    this.assertMonth(reportingMonth);
    const report = await this.repository.getReport(reportingMonth);
    if (!report) throw new NotFoundException('MRM report not found.');
    const attachment = await this.repository.getAttachment(report.id, attachmentId, user.accountId);
    if (!attachment) throw new NotFoundException('Attachment not found.');
    return attachment;
  }

  async deleteAttachment(reportingMonth: string, attachmentId: string, user: AuthenticatedUser) {
    this.assertMonth(reportingMonth);
    const report = await this.repository.getReport(reportingMonth);
    if (!report) throw new NotFoundException('MRM report not found.');
    await this.repository.deleteAttachment(report.id, attachmentId, user.accountId);
  }

  private mapColumn(column: MrmColumnRecord, reportingMonth: string) {
    const rollingMonth = column.rolling_month_offset === null
      ? null
      : shiftMonth(reportingMonth, column.rolling_month_offset);
    const label = rollingMonth
      ? monthLabel(rollingMonth)
      : column.column_key === 'status'
        ? `YTD'${reportingMonth.slice(2, 4)} against TBP.${reportingMonth.slice(2, 4)}`
        : column.label.replace('\\n', '\n');
    return {
      id: column.column_key,
      key: column.column_key,
      label,
      type: column.column_type,
      managed: column.managed,
    };
  }

  private mapRow(
    row: MrmRowDefinitionRecord,
    columns: MrmColumnRecord[],
    cells: Map<string, unknown>,
  ) {
    return {
      key: row.row_key,
      tableKey: row.table_key,
      calculationKey: row.metric_key,
      title: row.title,
      description: row.description,
      mode: row.value_mode,
      highlighted: row.highlighted,
      muted: row.muted,
      emphasized: row.emphasized,
      managed: row.managed,
      cells: Object.fromEntries(columns.flatMap((column) => {
        const value = cells.get(`${row.row_key}\0${column.column_key}`);
        return value === undefined ? [] : [[column.column_key, value]];
      })),
    };
  }

  private applyCalculatedValues(document: MrmReportDocument, buckets: MrmMetricBucket[]): MrmReportDocument {
    const rollingMonths = new Map([
      ['rolling-previous', shiftMonth(document.reportingMonth, -2)],
      ['rolling-latest', shiftMonth(document.reportingMonth, -1)],
    ]);
    const totals = new Map<string, MrmMetricBucket>();
    for (const bucket of buckets) {
      const key = `${bucket.dataMonth}\0${bucket.metricKey}`;
      const total = totals.get(key);
      if (!total) {
        totals.set(key, { ...bucket });
        continue;
      }
      total.numerator += bucket.numerator;
      if (bucket.denominator !== null) {
        total.denominator = (total.denominator ?? 0) + bucket.denominator;
      }
      total.qualityCount += bucket.qualityCount;
    }
    return {
      ...document,
      rows: document.rows.map((row) => {
        if (row.mode !== 'calculated') return row;
        const cells = { ...row.cells };
        for (const [columnKey, dataMonth] of rollingMonths) {
          if (!document.columns.some((column) => column.key === columnKey)) continue;
          const metric = totals.get(`${dataMonth}\0${row.calculationKey ?? row.key}`);
          cells[columnKey] = !metric
            ? null
            : metric.denominator === null
              ? String(metric.numerator)
              : `${metric.numerator} (${metric.denominator > 0 ? ((metric.numerator / metric.denominator) * 100).toFixed(1) : '0.0'}%)`;
        }
        return { ...row, cells };
      }),
    };
  }

  private calculateRollingMonths(
    reportingMonth: string,
    accountId: string,
  ): Promise<MrmCalculation[]> {
    return Promise.all([
      this.calculations.calculate(shiftMonth(reportingMonth, -2), accountId),
      this.calculations.calculate(shiftMonth(reportingMonth, -1), accountId),
    ]);
  }

  private parseSaveInput(body: unknown): MrmSaveInput {
    if (!body || typeof body !== 'object') throw new BadRequestException('MRM save payload is required.');
    const value = body as Record<string, unknown>;
    if (!Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 0) {
      throw new BadRequestException('Expected revision is invalid.');
    }
    if (!Array.isArray(value.columns) || value.columns.length < 1 || value.columns.length > 50
      || !Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 100) {
      throw new BadRequestException('MRM rows or columns are invalid.');
    }
    const columns = value.columns.map((entry) => {
      if (!entry || typeof entry !== 'object') throw new BadRequestException('MRM column is invalid.');
      const column = entry as Record<string, unknown>;
      if (typeof column.key !== 'string' || !keyPattern.test(column.key)
        || typeof column.label !== 'string' || !column.label.trim() || column.label.length > 200
        || !['value', 'status', 'attachment'].includes(String(column.type))
        || typeof column.managed !== 'boolean') {
        throw new BadRequestException('MRM column is invalid.');
      }
      return { key: column.key, label: column.label, type: column.type as 'value' | 'status' | 'attachment', managed: column.managed };
    });
    const rows = value.rows.map((entry) => {
      if (!entry || typeof entry !== 'object') throw new BadRequestException('MRM row is invalid.');
      const row = entry as Record<string, unknown>;
      if (typeof row.key !== 'string' || !keyPattern.test(row.key)
        || typeof row.tableKey !== 'string' || !keyPattern.test(row.tableKey)
        || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 300
        || typeof row.description !== 'string' || row.description.length > 500
        || typeof row.highlighted !== 'boolean' || typeof row.muted !== 'boolean'
        || typeof row.emphasized !== 'boolean' || typeof row.managed !== 'boolean'
        || !row.cells || typeof row.cells !== 'object' || Array.isArray(row.cells)) {
        throw new BadRequestException('MRM row is invalid.');
      }
      return {
        key: row.key, tableKey: row.tableKey,
        title: row.title, description: row.description,
        highlighted: row.highlighted, muted: row.muted,
        emphasized: row.emphasized, managed: row.managed,
        cells: row.cells as Record<string, unknown>,
      };
    });
    if (new Set(columns.map((column) => column.key)).size !== columns.length
      || new Set(rows.map((row) => row.key)).size !== rows.length) {
      throw new BadRequestException('MRM row and column keys must be unique.');
    }
    return { expectedRevision: Number(value.expectedRevision), columns, rows };
  }

  private documentToSave(document: MrmReportDocument, expectedRevision: number): MrmSaveInput {
    return {
      expectedRevision,
      columns: document.columns.map((column) => ({
        key: column.key, label: column.label, type: column.type, managed: column.managed,
      })),
      rows: document.rows.map((row) => ({
        key: row.key, tableKey: row.tableKey,
        title: row.title, description: row.description,
        highlighted: row.highlighted, muted: row.muted,
        emphasized: row.emphasized, managed: row.managed,
        cells: row.mode === 'manual' ? row.cells : {},
      })),
    };
  }

  private assertMonth(month: string): void {
    if (!monthPattern.test(month)) throw new BadRequestException('Reporting month must use YYYY-MM.');
  }

  private isDocument(value: unknown): value is MrmReportDocument {
    if (!value || typeof value !== 'object') return false;
    const document = value as Partial<MrmReportDocument>;
    return document.schemaVersion === 1 && Array.isArray(document.columns) && Array.isArray(document.rows);
  }

  private normalizeDocument(document: MrmReportDocument): MrmReportDocument {
    return {
      ...document,
      rows: document.rows.map((row) => ({
        ...row,
        tableKey: row.tableKey ?? 'ps-in',
        calculationKey: row.calculationKey ?? (row.mode === 'calculated' ? row.key : null),
      })),
    };
  }
}