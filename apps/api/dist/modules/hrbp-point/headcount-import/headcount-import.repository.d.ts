import { DatabaseService } from '../../../database/database.service';
import type { HeadcountCommitResult, HeadcountPreview, ParsedHeadcountWorkbook, UploadedHeadcountFile } from './headcount-import.types';
export declare class HeadcountImportRepository {
    private readonly database;
    constructor(database: DatabaseService);
    createPreview(actorAccountId: string, file: UploadedHeadcountFile, parsed: ParsedHeadcountWorkbook): Promise<HeadcountPreview>;
    getPreview(previewId: string, actorAccountId: string): Promise<HeadcountPreview | null>;
    cancel(previewId: string, actorAccountId: string): Promise<boolean>;
    commit(previewId: string, actorAccountId: string, confirmReplacement: boolean): Promise<HeadcountCommitResult>;
    private buildPreview;
}
