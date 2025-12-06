/**
 * Token Factory
 * 
 * Generates synthetic test tokens for authentication testing.
 * All tokens are clearly marked as test-only and should never be used in production.
 */

import { generateTestId } from '../utils/test-helpers';

/**
 * Creates a synthetic access token for testing
 * 
 * @param prefix - Optional prefix for token identification
 * @returns Synthetic access token string
 */
export function createTestAccessToken(prefix = 'test'): string {
  return `${prefix}_access_token_${generateTestId()}`;
}

/**
 * Creates a synthetic refresh token for testing
 * 
 * @param prefix - Optional prefix for token identification
 * @returns Synthetic refresh token string
 */
export function createTestRefreshToken(prefix = 'test'): string {
  return `${prefix}_refresh_token_${generateTestId()}`;
}

/**
 * Creates a pair of test tokens (access + refresh)
 * 
 * @param prefix - Optional prefix for token identification
 * @returns Object containing access and refresh tokens
 */
export function createTestTokenPair(prefix = 'test'): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: createTestAccessToken(prefix),
    refreshToken: createTestRefreshToken(prefix),
  };
}

/**
 * Creates an invalid JWT token for testing error scenarios
 * 
 * @returns Invalid JWT token string
 */
export function createInvalidJwtToken(): string {
  return 'invalid.jwt.token';
}

/**
 * Creates a test token with specific identifier
 * 
 * @param identifier - Unique identifier for the token
 * @returns Test token string
 */
export function createTestTokenWithId(identifier: string): string {
  return `test_token_${identifier}`;
}

