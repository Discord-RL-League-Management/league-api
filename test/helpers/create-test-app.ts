import { INestApplication, ValidationPipe } from '@nestjs/common';
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
  // Apply same global pipes as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Apply same global filters as main.ts
  app.useGlobalFilters(
    new GlobalExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  await app.init();
  return app;
}
