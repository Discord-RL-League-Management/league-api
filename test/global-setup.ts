import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../.env.test'), override: true });

async function waitForDatabase(maxRetries = 30, delayMs = 1000): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      await prisma.$disconnect();
      console.log('✅ Test database connection successful');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Failed to connect to test database after ${maxRetries} attempts`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export default async function globalSetup() {
  console.log('🚀 Starting test database setup...');

  try {
    // Start postgres_test container
    console.log('📦 Starting postgres_test container...');
    execSync('docker compose up -d postgres_test', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    // Wait for database to be ready
    console.log('⏳ Waiting for database to be ready...');
    await waitForDatabase();

    // Apply migrations
    console.log('🔄 Applying database migrations...');
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });

    console.log('✅ Test database setup complete!');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}
