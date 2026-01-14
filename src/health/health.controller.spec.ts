/**
 * HealthController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { MemoryHealthIndicator } from '@nestjs/terminus';
import { DiskHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordApiHealthIndicator } from './indicators/discord-api.health';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: HealthCheckService;
  let mockPrismaHealthIndicator: PrismaHealthIndicator;
  let mockPrismaService: PrismaService;
  let mockMemoryHealthIndicator: MemoryHealthIndicator;
  let mockDiskHealthIndicator: DiskHealthIndicator;
  let mockDiscordApiHealthIndicator: DiscordApiHealthIndicator;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockHealthCheckService = {
      check: vi.fn(),
    } as unknown as HealthCheckService;

    mockPrismaHealthIndicator = {
      pingCheck: vi.fn(),
    } as unknown as PrismaHealthIndicator;

    mockPrismaService = {} as unknown as PrismaService;

    mockMemoryHealthIndicator = {
      checkHeap: vi.fn(),
      checkRSS: vi.fn(),
    } as unknown as MemoryHealthIndicator;

    mockDiskHealthIndicator = {
      checkStorage: vi.fn(),
    } as unknown as DiskHealthIndicator;

    mockDiscordApiHealthIndicator = {
      isHealthy: vi.fn(),
    } as unknown as DiscordApiHealthIndicator;

    mockConfigService = {
      get: vi.fn(),
    } as unknown as ConfigService;

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealthIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        { provide: DiskHealthIndicator, useValue: mockDiskHealthIndicator },
        {
          provide: DiscordApiHealthIndicator,
          useValue: mockDiscordApiHealthIndicator,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should_return_health_status_when_basic_endpoint_is_called', () => {
      vi.spyOn(mockConfigService, 'get').mockReturnValue('test');
      const originalUptime = process.uptime;
      vi.spyOn(process, 'uptime').mockReturnValue(123.456);

      const result = controller.check();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime', 123.456);
      expect(result).toHaveProperty('environment', 'test');
      expect(result).toHaveProperty('version');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

      process.uptime = originalUptime;
    });

    it('should_use_default_environment_when_config_not_set', () => {
      vi.spyOn(mockConfigService, 'get').mockImplementation(
        (key: string, defaultValue?: unknown) => {
          if (key === 'app.nodeEnv') return defaultValue ?? 'development';
          return defaultValue;
        },
      );

      const result = controller.check();

      expect(result.environment).toBe('development');
    });

    it('should_use_default_version_when_package_version_not_available', () => {
      const originalEnv = process.env.npm_package_version;
      delete process.env.npm_package_version;
      vi.spyOn(mockConfigService, 'get').mockReturnValue('test');

      const result = controller.check();

      expect(result.version).toBe('1.0.0');

      if (originalEnv) {
        process.env.npm_package_version = originalEnv;
      }
    });

    it('should_use_package_version_when_available', () => {
      const originalEnv = process.env.npm_package_version;
      process.env.npm_package_version = '2.0.0';
      vi.spyOn(mockConfigService, 'get').mockReturnValue('test');

      const result = controller.check();

      expect(result.version).toBe('2.0.0');

      if (originalEnv) {
        process.env.npm_package_version = originalEnv;
      } else {
        delete process.env.npm_package_version;
      }
    });

    it('should_return_iso_timestamp_when_check_is_called', () => {
      vi.spyOn(mockConfigService, 'get').mockReturnValue('test');
      const beforeTime = new Date();

      const result = controller.check();

      const afterTime = new Date();
      const resultTime = new Date(result.timestamp);
      expect(resultTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resultTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  describe('detailedCheck', () => {
    it('should_return_detailed_health_status_when_detailed_endpoint_is_called', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          storage: { status: 'up' },
          discord_api: { status: 'up' },
        },
      };

      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );
      vi.spyOn(mockPrismaHealthIndicator, 'pingCheck').mockReturnValue(
        Promise.resolve({ database: { status: 'up' } }) as never,
      );
      vi.spyOn(mockMemoryHealthIndicator, 'checkHeap').mockReturnValue(
        Promise.resolve({ memory_heap: { status: 'up' } }) as never,
      );
      vi.spyOn(mockMemoryHealthIndicator, 'checkRSS').mockReturnValue(
        Promise.resolve({ memory_rss: { status: 'up' } }) as never,
      );
      vi.spyOn(mockDiskHealthIndicator, 'checkStorage').mockReturnValue(
        Promise.resolve({ storage: { status: 'up' } }) as never,
      );
      vi.spyOn(mockDiscordApiHealthIndicator, 'isHealthy').mockResolvedValue({
        discord_api: { status: 'up' },
      } as never);

      const result = await controller.detailedCheck();

      expect(result).toEqual(mockHealthResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      expect(checkCall[0]).toHaveLength(5);
    });

    it('should_call_all_health_indicators_when_detailed_check_is_performed', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {},
      };

      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );
      vi.spyOn(mockPrismaHealthIndicator, 'pingCheck').mockReturnValue(
        Promise.resolve({}) as never,
      );
      vi.spyOn(mockMemoryHealthIndicator, 'checkHeap').mockReturnValue(
        Promise.resolve({}) as never,
      );
      vi.spyOn(mockMemoryHealthIndicator, 'checkRSS').mockReturnValue(
        Promise.resolve({}) as never,
      );
      vi.spyOn(mockDiskHealthIndicator, 'checkStorage').mockReturnValue(
        Promise.resolve({}) as never,
      );
      vi.spyOn(mockDiscordApiHealthIndicator, 'isHealthy').mockResolvedValue(
        {} as never,
      );

      await controller.detailedCheck();

      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      const healthChecks = checkCall[0];

      expect(healthChecks).toHaveLength(5);
      expect(typeof healthChecks[0]).toBe('function');
      expect(typeof healthChecks[1]).toBe('function');
      expect(typeof healthChecks[2]).toBe('function');
      expect(typeof healthChecks[3]).toBe('function');
      expect(typeof healthChecks[4]).toBe('function');
    });

    it('should_check_database_health_when_detailed_check_is_performed', async () => {
      const mockHealthResult = { status: 'ok', info: {} };
      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );

      await controller.detailedCheck();

      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      const databaseCheck = checkCall[0][0];

      await databaseCheck();
      expect(mockPrismaHealthIndicator.pingCheck).toHaveBeenCalledWith(
        'database',
        mockPrismaService,
      );
    });

    it('should_check_memory_heap_when_detailed_check_is_performed', async () => {
      const mockHealthResult = { status: 'ok', info: {} };
      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );

      await controller.detailedCheck();

      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      const memoryHeapCheck = checkCall[0][1];

      await memoryHeapCheck();
      expect(mockMemoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        150 * 1024 * 1024,
      );
    });

    it('should_check_memory_rss_when_detailed_check_is_performed', async () => {
      const mockHealthResult = { status: 'ok', info: {} };
      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );

      await controller.detailedCheck();

      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      const memoryRSSCheck = checkCall[0][2];

      await memoryRSSCheck();
      expect(mockMemoryHealthIndicator.checkRSS).toHaveBeenCalledWith(
        'memory_rss',
        150 * 1024 * 1024,
      );
    });

    it('should_check_storage_when_detailed_check_is_performed', async () => {
      const mockHealthResult = { status: 'ok', info: {} };
      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );

      await controller.detailedCheck();

      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      const storageCheck = checkCall[0][3];

      await storageCheck();
      expect(mockDiskHealthIndicator.checkStorage).toHaveBeenCalledWith(
        'storage',
        { path: '/', thresholdPercent: 0.9 },
      );
    });

    it('should_check_discord_api_when_detailed_check_is_performed', async () => {
      const mockHealthResult = { status: 'ok', info: {} };
      vi.spyOn(mockHealthCheckService, 'check').mockResolvedValue(
        mockHealthResult as never,
      );

      await controller.detailedCheck();

      const checkCall = vi.mocked(mockHealthCheckService.check).mock.calls[0];
      const discordApiCheck = checkCall[0][4];

      await discordApiCheck();
      expect(mockDiscordApiHealthIndicator.isHealthy).toHaveBeenCalledWith(
        'discord_api',
      );
    });
  });
});
