import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

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
  private readonly serviceName = PrismaService.name;

  constructor(
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.loggingService.log('✅ Database connected', this.serviceName);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async onApplicationShutdown(signal?: string) {
    this.loggingService.log(
      `Application shutting down: ${signal || 'unknown signal'}`,
      this.serviceName,
    );
    await this.$disconnect();
    this.loggingService.log(
      '✅ Database disconnected on shutdown',
      this.serviceName,
    );
  }
}
