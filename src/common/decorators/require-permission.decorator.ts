import { SetMetadata } from '@nestjs/common';

// Metadata key storing required permissions array for authorization guards to enforce permission-based access control
export const PERMISSIONS_KEY = 'permissions';

// Specifies required permissions for route access to enable authorization guards to check granular user permissions
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
