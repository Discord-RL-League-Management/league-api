import { SetMetadata } from '@nestjs/common';

// Metadata key storing required roles array for authorization guards to enforce role-based access control
export const ROLES_KEY = 'roles';

// Specifies required roles for route access to enable authorization guards to check user permissions
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
