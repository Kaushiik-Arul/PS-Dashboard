import type { AuthenticatedUser } from '../../auth/auth.types';
import { HeadcountImportService } from './headcount-import.service';
import type { UploadedHeadcountFile } from './headcount-import.types';
export declare class HeadcountImportController {
    private readonly service;
    constructor(service: HeadcountImportService);
    createPreview(file: UploadedHeadcountFile | undefined, user: AuthenticatedUser): Promise<import("./headcount-import.types").HeadcountPreview>;
    getPreview(previewId: string, user: AuthenticatedUser): Promise<import("./headcount-import.types").HeadcountPreview>;
    cancel(previewId: string, user: AuthenticatedUser): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, user: AuthenticatedUser): Promise<import("./headcount-import.types").HeadcountCommitResult>;
}
