import { RbinMappingsService } from './rbin-mappings.service';
export declare class RbinMappingsController {
    private readonly service;
    constructor(service: RbinMappingsService);
    list(kind: string, search?: string, filter?: string, page?: string, pageSize?: string): Promise<import("./rbin-mappings.types").RbinMappingPage>;
    create(kind: string, body: unknown): Promise<import("./rbin-mappings.types").RbinMapping>;
    update(kind: string, mappingId: string, body: unknown): Promise<import("./rbin-mappings.types").RbinMapping>;
    delete(kind: string, mappingId: string): Promise<void>;
}
