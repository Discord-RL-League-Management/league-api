import { SetMetadata } from '@nestjs/common';

// Metadata key used by guards to identify routes that skip authentication for public endpoints like OAuth callbacks
export const IS_PUBLIC_KEY = 'isPublic';

// Marks routes as publicly accessible to bypass JWT authentication guards when authentication is not required
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
