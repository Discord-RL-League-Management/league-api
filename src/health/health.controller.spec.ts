import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DiscordApiHealthIndicator } from './indicators/discord-api.health';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              info: {
                database: { status: 'up' },
                memory_heap: { status: 'up' },
                memory_rss: { status: 'up' },
                storage: { status: 'up' },
                discord_api: { status: 'up' },
              },
            }),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn(),
            checkRSS: jest.fn(),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn(),
          },
        },
        {
          provide: HealthIndicatorService,
          useValue: {
            getStatus: jest.fn(),
          },
        },
        {
          provide: DiscordApiHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return health check response with correct structure', () => {
      // Act
      const result = controller.check();

      // Assert
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('version');
    });

    it('should return timestamp in ISO format', () => {
      // Act
      const result = controller.check();

      // Assert
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should return uptime as a number', () => {
      // Act
      const result = controller.check();

      // Assert
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return environment from process.env.NODE_ENV', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // Act
      const result = controller.check();

      // Assert
      expect(result.environment).toBe('test');

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should return development as default environment when NODE_ENV is not set', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      // Act
      const result = controller.check();

      // Assert
      expect(result.environment).toBe('development');

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should return version from process.env.npm_package_version', () => {
      // Arrange
      const originalVersion = process.env.npm_package_version;
      process.env.npm_package_version = '2.0.0';

      // Act
      const result = controller.check();

      // Assert
      expect(result.version).toBe('2.0.0');

      // Cleanup
      process.env.npm_package_version = originalVersion;
    });

    it('should return 1.0.0 as default version when npm_package_version is not set', () => {
      // Arrange
      const originalVersion = process.env.npm_package_version;
      delete process.env.npm_package_version;

      // Act
      const result = controller.check();

      // Assert
      expect(result.version).toBe('1.0.0');

      // Cleanup
      process.env.npm_package_version = originalVersion;
    });

    it('should return different timestamps for multiple calls', async () => {
      // Act
      const result1 = controller.check();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait 10ms to ensure different timestamps
      const result2 = controller.check();

      // Assert
      expect(result1.timestamp).not.toBe(result2.timestamp);
    });

    it('should return increasing uptime for multiple calls', async () => {
      // Act
      const result1 = controller.check();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait 10ms
      const result2 = controller.check();

      // Assert
      expect(result2.uptime).toBeGreaterThan(result1.uptime);
    });
  });
});
