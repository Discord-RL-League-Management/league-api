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
    this.logger.log('Attempting to connect to database...');
    try {
      await this.$connect();
      this.logger.log('Database connection successful');
    } catch (error) {
      this.logger.error('Database connection failed', error);
      throw error;
    }
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
