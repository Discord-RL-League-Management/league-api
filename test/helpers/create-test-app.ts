import { INestApplication } from '@nestjs/common';

/**
 * Initialize test application with production-like configuration using module-level pipe and filter providers
 *
 * @param app - The NestJS application instance
 * @returns The configured and initialized application
 */
export async function bootstrapTestApp(
  app: INestApplication,
): Promise<INestApplication> {
  await app.init();
  return app;
}
