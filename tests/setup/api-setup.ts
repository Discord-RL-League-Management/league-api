/**
 * API Test Setup
 *
 * Setup for API/Integration tests using Axios.
 * Ensures stateless, parallel-executable tests.
 */
import * as dotenv from 'dotenv';
// Load environment variables from .env file (ConfigModule doesn't run in test setup)
dotenv.config();

import axios from 'axios';

export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // TQA: Maximum 5s timeout for integration tests
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});

process.env.NODE_ENV = 'test';

// Validate required environment variables for tests
if (!process.env.JWT_PRIVATE_KEY) {
  throw new Error(
    'JWT_PRIVATE_KEY environment variable is required for tests. ' +
      'Set JWT_PRIVATE_KEY in your test environment. ' +
      'Generate test keys using: openssl genrsa -out jwt-private.pem 2048',
  );
}
