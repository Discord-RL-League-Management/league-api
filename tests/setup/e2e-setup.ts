/**
 * E2E Test Setup
 *
 * Setup for Playwright E2E tests.
 * Implements BDD patterns and ensures test isolation.
 */
import * as dotenv from 'dotenv';
// Load environment variables from .env file (ConfigModule doesn't run in test setup)
dotenv.config();

// Validate required environment variables for tests
if (!process.env.JWT_PRIVATE_KEY) {
  throw new Error(
    'JWT_PRIVATE_KEY environment variable is required for tests. ' +
      'Set JWT_PRIVATE_KEY in your test environment. ' +
      'Generate test keys using: openssl genrsa -out jwt-private.pem 2048',
  );
}

export const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
