import { DatabaseService } from '../../database/database.service';
import type { MrmAttachment, MrmMetricBucket, MrmSaveInput, MrmUploadedFile } from './mrm.types';
export type MrmReportRecord = {
    id: string;
    reporting_month: string;
    data_month: string;
    status: 'draft' | 'finalized';
    revision: string;
    updated_at: string;
    finalized_at: string | null;
};
export type MrmRowDefinitionRecord = {
    row_key: string;
    title: string;
    description: string;
    value_mode: 'manual' | 'calculated';
    highlighted: boolean;
    muted: boolean;
    emphasized: boolean;
    managed: boolean;
};
export type MrmColumnRecord = {
    column_key: string;
    label: string;
    column_type: 'value' | 'status' | 'attachment';
    managed: boolean;
    rolling_month_offset: number | null;
};
export type MrmCellRecord = {
    row_key: string;
    column_key: string;
    value: unknown;
};
export declare class MrmRepository {
    private readonly database;
    constructor(database: DatabaseService);
    listAvailableDataMonths(): Promise<string[]>;
    listReports(): Promise<Array<{
        reportingMonth: string;
        dataMonth: string;
        status: 'draft' | 'finalized';
    }>>;
    getReport(reportingMonth: string): Promise<MrmReportRecord | null>;
    getRows(reportingMonth: string, reportId: string | null): Promise<MrmRowDefinitionRecord[]>;
    getColumns(reportingMonth: string, reportId: string | null): Promise<MrmColumnRecord[]>;
    getCells(reportId: string | null): Promise<MrmCellRecord[]>;
    getAttachments(reportId: string | null): Promise<MrmAttachment[]>;
    getSnapshot(reportId: string): Promise<unknown>;
    getScopedBuckets(reportId: string, accountId: string): Promise<MrmMetricBucket[]>;
    saveDraft(reportingMonth: string, accountId: string, input: MrmSaveInput): Promise<number>;
    private saveLayout;
    finalize(reportId: string, accountId: string, expectedRevision: number, buckets: MrmMetricBucket[], payload: unknown): Promise<void>;
    addAttachment(reportId: string, rowKey: string, columnKey: string, accountId: string, file: MrmUploadedFile, safeFilename: string, sha256: string): Promise<string>;
    getAttachment(reportId: string, attachmentId: string, accountId: string): Promise<{
        filename: string;
        mime_type: string;
        size_bytes: number;
        content: Buffer;
    }>;
    deleteAttachment(reportId: string, attachmentId: string, accountId: string): Promise<void>;
}
