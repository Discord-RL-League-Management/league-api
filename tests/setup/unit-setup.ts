/**
 * Unit Test Setup
 * 
 * Global setup for Vitest unit tests.
 * Ensures stateless, isolated test execution.
 */
import 'reflect-metadata';

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress NestJS Logger output during tests for cleaner test output
// NestJS Logger writes directly to stdout/stderr, so we intercept those streams
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

process.stdout.write = function(chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error) => void), cb?: (err?: Error) => void): boolean {
  const message = typeof chunk === 'string' ? chunk : chunk.toString();
  // Suppress NestJS logger output (matches patterns like [Nest] or [ServiceName])
  // Also handle multi-line messages and partial writes
  if (message.includes('[Nest]') || 
      message.includes('[GuildsService]') || 
      message.includes('[TrackerService]') || 
      message.includes('[LeagueMemberService]') || 
      message.includes('[MmrCalculationService]')) {
    return true;
  }
  // Handle callback-style calls
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

process.stderr.write = function(chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error) => void), cb?: (err?: Error) => void): boolean {
  const message = typeof chunk === 'string' ? chunk : chunk.toString();
  // Suppress NestJS logger error output
  // Also handle multi-line messages and partial writes
  if (message.includes('[Nest]') || 
      message.includes('[GuildsService]') || 
      message.includes('[TrackerService]') || 
      message.includes('[LeagueMemberService]') || 
      message.includes('[MmrCalculationService]')) {
    return true;
  }
  // Handle callback-style calls
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

// Global test utilities can be added here
// Example: Mock implementations, test helpers, etc.
