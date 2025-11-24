import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { PrismaExceptionFilter } from '../../src/common/filters/prisma-exception.filter';

/**
 * Bootstrap a test application with production-like configuration
 *
 * Single Responsibility: Configure NestJS app for testing
 * - Applies global pipes (validation)
 * - Applies global filters (error handling)
 * - Initializes the application
 *
 * @param app - The NestJS application instance
 * @returns The configured and initialized application
 */
export async function bootstrapTestApp(
  app: INestApplication,
): Promise<INestApplication> {
  // Get ConfigService from app (must be done after app is created but before init)
  const configService = app.get(ConfigService);

  // Apply same global pipes as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Apply same global filters as main.ts
  // Execution order: Filters are executed in reverse registration order
  app.useGlobalFilters(
    new PrismaExceptionFilter(), // Handles Prisma errors first
    new GlobalExceptionFilter(configService), // Catches all other exceptions
  );

  await app.init();
  return app;
}
