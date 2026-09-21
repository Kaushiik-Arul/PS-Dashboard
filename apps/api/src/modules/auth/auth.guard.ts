import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import { readCookie, csrfCookieName, getSessionCookieName } from './auth.cookies';
import { ALLOW_PASSWORD_CHANGE_KEY, IS_PUBLIC_KEY } from './auth.decorators';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const isProduction = this.config.get('NODE_ENV', { infer: true }) === 'production';
    const sessionToken = readCookie(request, getSessionCookieName(isProduction));
    const user = await this.authService.authenticate(sessionToken);
    if (!user) throw new UnauthorizedException('Authentication required');

    (request as AuthenticatedRequest).user = user;

    const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (user.mustChangePassword && !allowPasswordChange) {
      throw new ForbiddenException('Password change required');
    }

    if (!safeMethods.has(request.method)) {
      const csrfCookie = readCookie(request, csrfCookieName);
      const csrfHeader = request.headers['x-csrf-token'];
      this.authService.validateCsrf(
        user,
        csrfCookie,
        typeof csrfHeader === 'string' ? csrfHeader : undefined,
      );
    }

    return true;
  }
}