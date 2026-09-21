import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

export const REQUIRED_PERMISSION_KEY = 'authorization:required-permission';

export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);