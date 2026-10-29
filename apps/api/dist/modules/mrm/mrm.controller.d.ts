import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MrmService } from './mrm.service';
import type { MrmUploadedFile } from './mrm.types';
export declare class MrmController {
    private readonly service;
    constructor(service: MrmService);
    listMonths(): Promise<{
        currentMonth: string;
        months: {
            sourceStatus: import("./mrm.types").MrmSourceStatus;
            reportingMonth: string;
            dataMonth: string;
            status: "draft" | "finalized";
        }[];
    }>;
    getReport(reportingMonth: string, user: AuthenticatedUser): Promise<import("./mrm.types").MrmReportDocument>;
    saveReport(reportingMonth: string, body: unknown, user: AuthenticatedUser): Promise<import("./mrm.types").MrmReportDocument>;
    finalize(reportingMonth: string, expectedRevision: unknown, user: AuthenticatedUser): Promise<import("./mrm.types").MrmReportDocument>;
    uploadAttachment(reportingMonth: string, rowKey: unknown, columnKey: unknown, file: MrmUploadedFile | undefined, user: AuthenticatedUser): Promise<import("./mrm.types").MrmReportDocument>;
    downloadAttachment(reportingMonth: string, attachmentId: string, user: AuthenticatedUser, response: Response): Promise<Buffer<ArrayBufferLike>>;
    deleteAttachment(reportingMonth: string, attachmentId: string, user: AuthenticatedUser): Promise<void>;
}
