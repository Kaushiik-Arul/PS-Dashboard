import { DatabaseService } from '../../../database/database.service';
import { type RbinException, type RbinExceptionInput, type RbinExceptionPage, type RbinExceptionRuleInput } from './rbin-exceptions.types';
export declare class RbinExceptionsRepository {
    private readonly database;
    constructor(database: DatabaseService);
    list(search: string, filter: string, page: number, pageSize: number): Promise<Omit<RbinExceptionPage, 'columns'>>;
    createMany(persNo: string, rules: RbinExceptionRuleInput[], actorAccountId: string): Promise<RbinException[]>;
    update(id: string, input: RbinExceptionInput, actorAccountId: string): Promise<RbinException | null>;
    delete(id: string, actorAccountId: string): Promise<boolean>;
    private audit;
}
