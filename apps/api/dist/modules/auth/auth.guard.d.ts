import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import { AuthService } from './auth.service';
export declare class AuthGuard implements CanActivate {
    private readonly reflector;
    private readonly authService;
    private readonly config;
    constructor(reflector: Reflector, authService: AuthService, config: ConfigService<Environment, true>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
