import { JobDescriptionsRepository } from './job-descriptions.repository';
import type { JobDescription, JobDescriptionPage } from './job-descriptions.types';
export declare class JobDescriptionsService {
    private readonly repository;
    private readonly logger;
    constructor(repository: JobDescriptionsRepository);
    list(searchInput?: string, pageInput?: string, pageSizeInput?: string): Promise<JobDescriptionPage>;
    create(body: unknown, actorAccountId: string): Promise<JobDescription>;
    importCsv(file: {
        originalname: string;
        buffer: Buffer;
    } | undefined, actorAccountId: string): Promise<{
        totalRows: number;
        created: number;
        updated: number;
        unchanged: number;
    }>;
    update(idInput: string, body: unknown, actorAccountId: string): Promise<JobDescription>;
    delete(idInput: string, actorAccountId: string): Promise<void>;
    private validateId;
    private validateInput;
    private positiveInteger;
    private runDatabaseOperation;
}
