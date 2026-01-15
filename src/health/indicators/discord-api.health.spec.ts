/**
 * DiscordApiHealthIndicator Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { DiscordApiHealthIndicator } from './discord-api.health';
import { HealthIndicatorService } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

describe('DiscordApiHealthIndicator', () => {
  let indicator: DiscordApiHealthIndicator;
  let mockHealthIndicatorService: HealthIndicatorService;
  let mockConfigService: ConfigService;

  const mockKey = 'discord-api';

  beforeEach(async () => {
    mockHealthIndicatorService = {
      check: vi.fn(),
    } as unknown as HealthIndicatorService;

    mockConfigService = {
      get: vi.fn(),
    } as unknown as ConfigService;

    const module = await Test.createTestingModule({
      providers: [
        DiscordApiHealthIndicator,
        {
          provide: HealthIndicatorService,
          useValue: mockHealthIndicatorService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    indicator = module.get<DiscordApiHealthIndicator>(
      DiscordApiHealthIndicator,
    );
  });

  describe('isHealthy', () => {
    it('should_return_up_status_when_client_id_is_configured', async () => {
      const mockIndicator = {
        up: vi.fn((data) => ({ [mockKey]: data })),
        down: vi.fn((data) => ({ [mockKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockReturnValue('client-id-123');

      const result = await indicator.isHealthy(mockKey);

      expect(result[mockKey]).toHaveProperty('status', 'up');
      expect(result[mockKey]).toHaveProperty('clientId', 'configured');
      expect(mockIndicator.up).toHaveBeenCalled();
    });

    it('should_return_down_status_when_client_id_is_not_configured', async () => {
      const mockIndicator = {
        up: vi.fn((data) => ({ [mockKey]: data })),
        down: vi.fn((data) => ({ [mockKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockReturnValue(undefined);

      const result = await indicator.isHealthy(mockKey);

      expect(result[mockKey]).toHaveProperty('status', 'down');
      expect(result[mockKey]).toHaveProperty(
        'error',
        'Client ID not configured',
      );
      expect(mockIndicator.down).toHaveBeenCalled();
    });

    it('should_return_down_status_when_client_id_is_empty_string', async () => {
      const mockIndicator = {
        up: vi.fn((data) => ({ [mockKey]: data })),
        down: vi.fn((data) => ({ [mockKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockReturnValue('');

      const result = await indicator.isHealthy(mockKey);

      expect(result[mockKey]).toHaveProperty('status', 'down');
      expect(result[mockKey]).toHaveProperty(
        'error',
        'Client ID not configured',
      );
      expect(mockIndicator.down).toHaveBeenCalled();
    });

    it('should_return_down_status_when_error_occurs', async () => {
      const mockIndicator = {
        up: vi.fn((data) => ({ [mockKey]: data })),
        down: vi.fn((data) => ({ [mockKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockImplementation(() => {
        throw new Error('Config service error');
      });

      const result = await indicator.isHealthy(mockKey);

      expect(result[mockKey]).toHaveProperty('status', 'down');
      expect(result[mockKey]).toHaveProperty('error', 'Config service error');
      expect(mockIndicator.down).toHaveBeenCalled();
    });

    it('should_handle_unknown_error_type', async () => {
      const mockIndicator = {
        up: vi.fn((data) => ({ [mockKey]: data })),
        down: vi.fn((data) => ({ [mockKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockImplementation(() => {
        throw 'String error';
      });

      const result = await indicator.isHealthy(mockKey);

      expect(result[mockKey]).toHaveProperty('status', 'down');
      expect(result[mockKey]).toHaveProperty('error', 'Unknown error');
      expect(mockIndicator.down).toHaveBeenCalled();
    });

    it('should_check_discord_client_id_config', async () => {
      const mockIndicator = {
        up: vi.fn((data) => ({ [mockKey]: data })),
        down: vi.fn((data) => ({ [mockKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockReturnValue('client-id-123');

      await indicator.isHealthy(mockKey);

      expect(mockConfigService.get).toHaveBeenCalledWith('discord.clientId');
    });

    it('should_use_provided_key_for_health_indicator', async () => {
      const customKey = 'custom-discord-key';
      const mockIndicator = {
        up: vi.fn((data) => ({ [customKey]: data })),
        down: vi.fn((data) => ({ [customKey]: data })),
      };
      vi.spyOn(mockHealthIndicatorService, 'check').mockReturnValue(
        mockIndicator as never,
      );
      vi.spyOn(mockConfigService, 'get').mockReturnValue('client-id-123');

      const result = await indicator.isHealthy(customKey);

      expect(mockHealthIndicatorService.check).toHaveBeenCalledWith(customKey);
      expect(result[customKey]).toBeDefined();
    });
  });
});
