import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

export const IS_PUBLIC_KEY = 'auth:is-public';
export const ALLOW_PASSWORD_CHANGE_KEY = 'auth:allow-password-change';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);