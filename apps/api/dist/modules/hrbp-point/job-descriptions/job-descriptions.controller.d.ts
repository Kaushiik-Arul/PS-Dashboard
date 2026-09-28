import type { AuthenticatedUser } from '../../auth/auth.types';
import { JobDescriptionsService } from './job-descriptions.service';
export declare class JobDescriptionsController {
    private readonly service;
    constructor(service: JobDescriptionsService);
    list(search?: string, page?: string, pageSize?: string): Promise<import("./job-descriptions.types").JobDescriptionPage>;
    create(body: unknown, user: AuthenticatedUser): Promise<import("./job-descriptions.types").JobDescription>;
    importCsv(file: {
        originalname: string;
        buffer: Buffer;
    } | undefined, user: AuthenticatedUser): Promise<{
        totalRows: number;
        created: number;
        updated: number;
        unchanged: number;
    }>;
    update(id: string, body: unknown, user: AuthenticatedUser): Promise<import("./job-descriptions.types").JobDescription>;
    delete(id: string, user: AuthenticatedUser): Promise<void>;
}
