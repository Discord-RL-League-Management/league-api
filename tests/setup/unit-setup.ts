/**
 * Unit Test Setup
 *
 * Global setup for Vitest unit tests.
 * Ensures stateless, isolated test execution.
 */
import * as dotenv from 'dotenv';
// Load environment variables from .env file (ConfigModule doesn't run in test setup)
dotenv.config();

import 'reflect-metadata';

process.env.NODE_ENV = 'test';

// Validate required environment variables for tests
if (!process.env.JWT_PRIVATE_KEY) {
  throw new Error(
    'JWT_PRIVATE_KEY environment variable is required for tests. ' +
      'Set JWT_PRIVATE_KEY in your test environment. ' +
      'Generate test keys using: openssl genrsa -out jwt-private.pem 2048',
  );
}

// NestJS Logger writes directly to stdout/stderr, so we intercept those streams
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

process.stdout.write = function (
  chunk: string | Uint8Array,
  encoding?: BufferEncoding | ((err?: Error) => void),
  cb?: (err?: Error) => void,
): boolean {
  const message = typeof chunk === 'string' ? chunk : chunk.toString();
  // Handle multi-line messages and partial writes
  if (
    message.includes('[Nest]') ||
    message.includes('[GuildsService]') ||
    message.includes('[TrackerService]') ||
    message.includes('[LeagueMemberService]') ||
    message.includes('[MmrCalculationService]')
  ) {
    return true;
  }
  if (typeof encoding === 'function') {
    encoding(undefined);
    return true;
  }
  if (typeof cb === 'function') {
    cb(undefined);
    return true;
  }
  return originalStdoutWrite(chunk, encoding as BufferEncoding, cb);
};

process.stderr.write = function (
  chunk: string | Uint8Array,
  encoding?: BufferEncoding | ((err?: Error) => void),
  cb?: (err?: Error) => void,
): boolean {
  const message = typeof chunk === 'string' ? chunk : chunk.toString();
  // Handle multi-line messages and partial writes
  if (
    message.includes('[Nest]') ||
    message.includes('[GuildsService]') ||
    message.includes('[TrackerService]') ||
    message.includes('[LeagueMemberService]') ||
    message.includes('[MmrCalculationService]')
  ) {
    return true;
  }
  if (typeof encoding === 'function') {
    encoding(undefined);
    return true;
  }
  if (typeof cb === 'function') {
    cb(undefined);
    return true;
  }
  return originalStderrWrite(chunk, encoding as BufferEncoding, cb);
};
