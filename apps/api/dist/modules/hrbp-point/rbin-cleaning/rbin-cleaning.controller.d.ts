import { StreamableFile } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { RbinCleaningService } from './rbin-cleaning.service';
import type { UploadedRbinFile } from './rbin-cleaning.types';
export declare class RbinCleaningController {
    private readonly service;
    constructor(service: RbinCleaningService);
    createBatch(file: UploadedRbinFile | undefined, user: AuthenticatedUser): Promise<import("./rbin-cleaning.types").RbinBatchSummary>;
    listBatches(user: AuthenticatedUser): Promise<import("./rbin-cleaning.types").RbinBatchSummary[]>;
    getRows(batchId: string, filter: string | undefined, page: string | undefined, pageSize: string | undefined, search: string | undefined, user: AuthenticatedUser): Promise<import("./rbin-cleaning.types").RbinPreviewPage>;
    updateRow(batchId: string, rowNumber: string, input: unknown, user: AuthenticatedUser): Promise<import("./rbin-cleaning.types").RbinBatchSummary>;
    finalize(batchId: string, user: AuthenticatedUser): Promise<import("./rbin-cleaning.types").RbinBatchSummary>;
    export(batchId: string, user: AuthenticatedUser): Promise<StreamableFile>;
}
