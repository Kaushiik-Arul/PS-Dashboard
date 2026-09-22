import { RbinMappingsRepository } from './rbin-mappings.repository';
import { type RbinMapping, type RbinMappingPage } from './rbin-mappings.types';
export declare class RbinMappingsService {
    private readonly repository;
    private readonly logger;
    constructor(repository: RbinMappingsRepository);
    list(kindInput: string, searchInput?: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<RbinMappingPage>;
    create(kindInput: string, body: unknown): Promise<RbinMapping>;
    update(kindInput: string, idInput: string, body: unknown): Promise<RbinMapping>;
    delete(kindInput: string, idInput: string): Promise<void>;
    private validateKind;
    private validateId;
    private validateInput;
    private positiveInteger;
    private runDatabaseOperation;
}
