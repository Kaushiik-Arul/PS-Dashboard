import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { Environment } from '../../config/environment';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService<Environment, true>);
    login(input: unknown, request: Request, response: Response): Promise<{
        accountId: string;
        persNo: string | null;
        displayName: string;
        loginEmail: string;
        role: "hrbp" | "admin" | "range_head" | "department_head" | "sub_department_head";
        roles: ("hrbp" | "admin" | "range_head" | "department_head" | "sub_department_head")[];
        mustChangePassword: boolean;
    }>;
    me(user: AuthenticatedUser): {
        accountId: string;
        persNo: string | null;
        displayName: string;
        loginEmail: string;
        role: "hrbp" | "admin" | "range_head" | "department_head" | "sub_department_head";
        roles: ("hrbp" | "admin" | "range_head" | "department_head" | "sub_department_head")[];
        mustChangePassword: boolean;
    };
    changePassword(user: AuthenticatedUser, input: unknown, request: Request, response: Response): Promise<{
        accountId: string;
        persNo: string | null;
        displayName: string;
        loginEmail: string;
        role: "hrbp" | "admin" | "range_head" | "department_head" | "sub_department_head";
        roles: ("hrbp" | "admin" | "range_head" | "department_head" | "sub_department_head")[];
        mustChangePassword: boolean;
    }>;
    logout(user: AuthenticatedUser, request: Request, response: Response): Promise<void>;
    private writeSession;
    private isProduction;
}
