import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Manages database connections and ensures graceful shutdown
 *
 * Implements OnApplicationShutdown to prevent connection leaks and ensure data integrity during application termination.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    console.log('[PRISMA] Attempting to connect to database...');
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/7b59d5a7-b3ea-4ea5-a718-921dbf2d179f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'prisma.service.ts:23',
        message: 'before $connect',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    try {
      await this.$connect();
      console.log('[PRISMA] Database connection successful');
    } catch (error) {
      console.error('[PRISMA] Database connection failed:', error);
      throw error;
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/7b59d5a7-b3ea-4ea5-a718-921dbf2d179f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'prisma.service.ts:26',
        message: 'after $connect',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down: ${signal || 'unknown signal'}`);
    await this.$disconnect();
    this.logger.log('✅ Database disconnected on shutdown');
  }
}
