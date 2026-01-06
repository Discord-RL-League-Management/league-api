/**
 * Auth Factory
 *
 * Synthetic data factory for creating test authentication data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

// jsonwebtoken is available as a transitive dependency via @nestjs/jwt
// Using require to avoid type issues if @types/jsonwebtoken is not installed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');

export interface AuthFactoryData {
  userId: string;
  username: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  guilds?: Array<{ id: string }>;
}

/**
 * Generates a JWT token for testing
 *
 * Note: This creates a real JWT token using the same private key as the application.
 * For API contract verification, we need real tokens that can be validated.
 *
 * @param userData - User data to encode in token
 * @param privateKey - RSA private key in PEM format (defaults to JWT_PRIVATE_KEY env var)
 * @returns JWT access token
 * @throws Error if private key is missing or invalid
 */
export function generateJwtToken(
  userData: AuthFactoryData,
  privateKey: string = process.env.JWT_PRIVATE_KEY || '',
): string {
  if (!privateKey || !privateKey.trim()) {
    throw new Error(
      'JWT_PRIVATE_KEY environment variable is required for test token generation. ' +
        'Set JWT_PRIVATE_KEY in your test environment or pass a valid RSA private key.',
    );
  }

  if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
    throw new Error(
      'Invalid JWT private key format. Expected PEM format with BEGIN/END markers. ' +
        'Generate keys using: openssl genrsa -out jwt-private.pem 2048',
    );
  }

  const payload = {
    sub: userData.userId,
    username: userData.username,
    globalName: userData.globalName,
    avatar: userData.avatar,
    email: userData.email,
    guilds: userData.guilds?.map((g) => g.id) || [],
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7d',
  });
}

/**
 * Creates synthetic auth data for testing
 *
 * @param overrides - Optional overrides for default values
 * @returns Auth data object
 */
export function createAuthData(
  overrides: Partial<AuthFactoryData> = {},
): AuthFactoryData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);

  return {
    userId: `user_${timestamp}_${randomSuffix}`,
    username: `testuser_${randomSuffix}`,
    globalName: `Test User ${randomSuffix}`,
    avatar: `avatar_hash_${randomSuffix}`,
    email: `test_${randomSuffix}@example.com`,
    guilds: [],
    ...overrides,
  };
}
