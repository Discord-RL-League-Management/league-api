import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

// Load test environment variables before any other imports
// Override any existing .env file with test-specific values
config({ path: path.resolve(__dirname, '../.env.test'), override: true });

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Note: Database cleanup is handled by individual test files
// to avoid conflicts between different test suites

// Global test timeout
jest.setTimeout(30000);
