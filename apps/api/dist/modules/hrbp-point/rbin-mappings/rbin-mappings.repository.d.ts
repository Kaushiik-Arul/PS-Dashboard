import { DatabaseService } from '../../../database/database.service';
import type { RbinMapping, RbinMappingInput, RbinMappingKind, RbinMappingPage } from './rbin-mappings.types';
export declare class RbinMappingsRepository {
    private readonly database;
    constructor(database: DatabaseService);
    list(kind: RbinMappingKind, search: string, filter: string, page: number, pageSize: number): Promise<RbinMappingPage>;
    create(kind: RbinMappingKind, input: RbinMappingInput): Promise<RbinMapping | null>;
    update(kind: RbinMappingKind, id: string, input: RbinMappingInput): Promise<RbinMapping | null>;
    delete(kind: RbinMappingKind, id: string): Promise<boolean>;
}
