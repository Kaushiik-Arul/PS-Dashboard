import { RbinExceptionsRepository } from './rbin-exceptions.repository';
import { type RbinException, type RbinExceptionPage } from './rbin-exceptions.types';
export declare class RbinExceptionsService {
    private readonly repository;
    private readonly logger;
    constructor(repository: RbinExceptionsRepository);
    list(searchInput?: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<RbinExceptionPage>;
    create(body: unknown, actorAccountId: string): Promise<RbinException[]>;
    update(idInput: string, body: unknown, actorAccountId: string): Promise<RbinException>;
    delete(idInput: string, actorAccountId: string): Promise<void>;
    private rule;
    private record;
    private persNo;
    private validBigInt;
    private validDate;
    private uuid;
    private positiveInteger;
    private run;
}
