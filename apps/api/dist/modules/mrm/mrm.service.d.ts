import type { AuthenticatedUser } from '../auth/auth.types';
import { MrmCalculationService } from './mrm-calculation.service';
import { MrmRepository } from './mrm.repository';
import type { MrmReportDocument, MrmUploadedFile } from './mrm.types';
export declare class MrmService {
    private readonly repository;
    private readonly calculations;
    constructor(repository: MrmRepository, calculations: MrmCalculationService);
    listMonths(): Promise<{
        currentMonth: string;
        months: {
            sourceStatus: import("./mrm.types").MrmSourceStatus;
            reportingMonth: string;
            dataMonth: string;
            status: "draft" | "finalized";
        }[];
    }>;
    getReport(reportingMonth: string, user: AuthenticatedUser): Promise<MrmReportDocument>;
    saveReport(reportingMonth: string, user: AuthenticatedUser, body: unknown): Promise<MrmReportDocument>;
    finalize(reportingMonth: string, user: AuthenticatedUser, expectedRevision: unknown): Promise<MrmReportDocument>;
    uploadAttachment(reportingMonth: string, user: AuthenticatedUser, rowKey: unknown, columnKey: unknown, file: MrmUploadedFile | undefined): Promise<MrmReportDocument>;
    downloadAttachment(reportingMonth: string, attachmentId: string, user: AuthenticatedUser): Promise<{
        filename: string;
        mime_type: string;
        size_bytes: number;
        content: Buffer;
    }>;
    deleteAttachment(reportingMonth: string, attachmentId: string, user: AuthenticatedUser): Promise<void>;
    private mapColumn;
    private mapRow;
    private applyCalculatedValues;
    private parseSaveInput;
    private documentToSave;
    private assertMonth;
    private isDocument;
}
