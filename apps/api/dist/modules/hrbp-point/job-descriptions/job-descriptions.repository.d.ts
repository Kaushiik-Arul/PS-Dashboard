import { DatabaseService } from '../../../database/database.service';
import type { JobDescription, JobDescriptionInput, JobDescriptionPage } from './job-descriptions.types';
export declare class JobDescriptionsRepository {
    private readonly database;
    constructor(database: DatabaseService);
    list(search: string, page: number, pageSize: number): Promise<JobDescriptionPage>;
    findBySuffix(suffix: string): Promise<JobDescription[]>;
    create(input: JobDescriptionInput, actorAccountId: string): Promise<JobDescription>;
    importCsv(inputs: JobDescriptionInput[], fileName: string, actorAccountId: string): Promise<{
        totalRows: number;
        created: number;
        updated: number;
        unchanged: number;
    }>;
    update(id: string, input: JobDescriptionInput, actorAccountId: string): Promise<JobDescription | null>;
    delete(id: string, actorAccountId: string): Promise<boolean>;
    private findForUpdate;
    private audit;
}
