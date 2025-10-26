import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  cookieName: string;
  cookieHttpOnly: boolean;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  cookieMaxAge: number;
}

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'auth_token',
  cookieHttpOnly: true,
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieSameSite: (process.env.COOKIE_SAME_SITE as any) || 'lax',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
}));