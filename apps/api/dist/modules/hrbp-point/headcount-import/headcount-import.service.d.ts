import { HeadcountImportRepository } from './headcount-import.repository';
import type { HeadcountCommitResult, HeadcountPreview, UploadedHeadcountFile } from './headcount-import.types';
export declare class HeadcountImportService {
    private readonly repository;
    private readonly logger;
    constructor(repository: HeadcountImportRepository);
    createPreview(file: UploadedHeadcountFile | undefined, actorAccountId: string): Promise<HeadcountPreview>;
    getPreview(previewId: string, actorAccountId: string): Promise<HeadcountPreview>;
    cancel(previewId: string, actorAccountId: string): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, actorAccountId: string): Promise<HeadcountCommitResult>;
    private run;
}
