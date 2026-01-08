import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtExpiresIn: string;
  cookieName: string;
  cookieHttpOnly: boolean;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  cookieMaxAge: number;
}

// process.env usage here is intentional - this factory function
// is called by ConfigModule during initialization and validates via Joi schema
export default registerAs('auth', () => ({
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,
  jwtPublicKey: process.env.JWT_PUBLIC_KEY!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'auth_token',
  cookieHttpOnly: true,
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieSameSite:
    (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
}));
