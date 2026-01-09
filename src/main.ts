import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NewRelicLoggerService } from './logging/newrelic-logger.service';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use New Relic logger for centralized error tracking and monitoring
  const logger = app.get(NewRelicLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);

  // Enable cookie parsing to support HttpOnly cookies for secure session management
  app.use(cookieParser());

  // Apply security headers to prevent XSS, clickjacking, and other common web vulnerabilities
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Configure CORS to allow only trusted origins while supporting development and mobile clients
  app.enableCors(
    (
      req: Request,
      callback: (err: Error | null, options?: unknown) => void,
    ) => {
      // Normalize origin header to handle array type (Express can return string | string[] | undefined)
      const originHeader = req.headers.origin;
      const origin: string | undefined = Array.isArray(originHeader)
        ? typeof originHeader[0] === 'string'
          ? originHeader[0]
          : undefined
        : typeof originHeader === 'string'
          ? originHeader
          : undefined;

      // Filter out empty strings, null, and undefined from allowed origins
      const allowedOrigins = [
        configService.get<string>('frontend.url'),
        'http://localhost:5173',
        'http://localhost:3000',
      ].filter((allowedOrigin): allowedOrigin is string =>
        Boolean(allowedOrigin),
      );

      // CORS options object - shared across all allowed requests
      const corsOptions = {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
        ],
        credentials: true,
        maxAge: 86400,
      };

      // Handle requests with no origin header
      if (!origin) {
        const requestPath = req.path || req.url || '';
        const hasAuthHeader = !!req.headers.authorization;
        const nodeEnv = configService.get<string>('app.nodeEnv');
        const isDevelopment = nodeEnv === 'development';

        const isHealthEndpoint = requestPath.startsWith('/health');

        const allowNoOriginHealth = configService.get<boolean>(
          'cors.allowNoOriginHealth',
          true,
        );
        const allowNoOriginAuthenticated = configService.get<boolean>(
          'cors.allowNoOriginAuthenticated',
          true,
        );
        const allowNoOriginDevelopment = configService.get<boolean>(
          'cors.allowNoOriginDevelopment',
          true,
        );

        // Determine if no-origin request should be allowed
        let allowNoOrigin = false;
        let reason = '';

        if (isHealthEndpoint && allowNoOriginHealth) {
          allowNoOrigin = true;
          reason = 'health endpoint';
        } else if (hasAuthHeader && allowNoOriginAuthenticated) {
          allowNoOrigin = true;
          reason = 'authenticated request';
        } else if (isDevelopment && allowNoOriginDevelopment) {
          allowNoOrigin = true;
          reason = 'development environment';
        }

        // Log no-origin requests for security monitoring
        if (allowNoOrigin) {
          logger.log(
            `CORS: Allowed no-origin request - path: ${requestPath}, reason: ${reason}, hasAuth: ${hasAuthHeader}`,
          );
        } else {
          logger.warn(
            `CORS: Blocked no-origin request - path: ${requestPath}, hasAuth: ${hasAuthHeader}, environment: ${nodeEnv}`,
          );
        }

        if (allowNoOrigin) {
          return callback(null, corsOptions);
        } else {
          return callback(new Error('CORS: No-origin requests not allowed'));
        }
      }

      // Handle requests with origin header
      if (allowedOrigins.includes(origin)) {
        callback(null, corsOptions);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
  );

  // Expose Swagger documentation only in non-production to avoid exposing API structure in production
  if (configService.get<string>('app.nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('League Management API')
      .setDescription(
        'API for Discord bot and web frontend league management system',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Bot API key for internal endpoints',
        },
        'bot-api-key',
      )
      .addTag('Authentication', 'Discord OAuth and JWT authentication')
      .addTag('Users', 'User management endpoints')
      .addTag('Profile', 'User profile and settings')
      .addTag('Internal', 'Bot-only internal endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    // Provide alternative /docs route for easier access during development
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Enable graceful shutdown to allow cleanup of database connections and other resources
  app.enableShutdownHooks();

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${configService.get<string>('app.nodeEnv')}`);

  if (configService.get<string>('app.nodeEnv') !== 'production') {
    logger.log(
      `Swagger documentation available at: http://localhost:${port}/api-docs or http://localhost:${port}/docs`,
    );
  }
}
void bootstrap().catch((error) => {
  // Use console.error here as Logger may not be available during bootstrap failure

  console.error('Failed to start application:', error);
  if (error instanceof Error) {
    console.error(error.stack);
  }
  process.exit(1);
});
