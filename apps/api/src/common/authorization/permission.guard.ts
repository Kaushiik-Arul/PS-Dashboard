import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../modules/auth/auth.types';
import { hasPermission, type Permission } from './permissions';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!hasPermission(request.user.roles, permission)) {
      throw new ForbiddenException('Insufficient permission');
    }

    return true;
  }
}