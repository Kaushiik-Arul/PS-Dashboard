import type { AuthenticatedUser } from '../../auth/auth.types';
import { RbinExceptionsService } from './rbin-exceptions.service';
export declare class RbinExceptionsController {
    private readonly service;
    constructor(service: RbinExceptionsService);
    list(search?: string, filter?: string, page?: string, pageSize?: string): Promise<import("./rbin-exceptions.types").RbinExceptionPage>;
    create(body: unknown, user: AuthenticatedUser): Promise<import("./rbin-exceptions.types").RbinException[]>;
    update(exceptionId: string, body: unknown, user: AuthenticatedUser): Promise<import("./rbin-exceptions.types").RbinException>;
    delete(exceptionId: string, user: AuthenticatedUser): Promise<void>;
}
