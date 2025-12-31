/**
 * InAppConfigurationService Unit Tests
 *
 * Tests for in-app configuration service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { InAppConfigurationService } from '@/infrastructure/configuration/services/in-app-configuration.service';

describe('InAppConfigurationService', () => {
  let service: InAppConfigurationService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn(),
    } as unknown as ConfigService;

    service = new InAppConfigurationService(mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should_return_config_value_when_key_exists', () => {
      const key = 'app.port';
      const value = 3000;
      vi.mocked(mockConfigService.get).mockReturnValue(value);

      const result = service.get<number>(key);

      expect(result).toBe(value);
      expect(mockConfigService.get).toHaveBeenCalledWith(key);
    });

    it('should_return_default_value_when_key_not_found', () => {
      const key = 'app.port';
      const defaultValue = 8080;
      // Mock ConfigService.get to return default when called with default parameter
      vi.mocked(mockConfigService.get).mockImplementation(
        (k: string, def?: unknown) => def as number,
      );

      const result = service.get<number>(key, defaultValue);

      expect(result).toBe(defaultValue);
      expect(mockConfigService.get).toHaveBeenCalledWith(key, defaultValue);
    });

    it('should_return_undefined_when_key_not_found_and_no_default', () => {
      const key = 'app.unknown';
      vi.mocked(mockConfigService.get).mockReturnValue(undefined);

      const result = service.get<string>(key);

      expect(result).toBeUndefined();
      expect(mockConfigService.get).toHaveBeenCalledWith(key);
    });

    it('should_handle_string_config_values', () => {
      const key = 'discord.botToken';
      const value = 'token123';
      vi.mocked(mockConfigService.get).mockReturnValue(value);

      const result = service.get<string>(key);

      expect(result).toBe(value);
    });

    it('should_handle_boolean_config_values', () => {
      const key = 'app.enabled';
      const value = true;
      vi.mocked(mockConfigService.get).mockReturnValue(value);

      const result = service.get<boolean>(key);

      expect(result).toBe(value);
    });

    it('should_handle_object_config_values', () => {
      const key = 'app.settings';
      const value = { timeout: 5000, retries: 3 };
      vi.mocked(mockConfigService.get).mockReturnValue(value);

      const result = service.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should_pass_through_nested_key_paths', () => {
      const key = 'discord.api.url';
      const value = 'https://discord.com/api';
      vi.mocked(mockConfigService.get).mockReturnValue(value);

      const result = service.get<string>(key);

      expect(result).toBe(value);
      expect(mockConfigService.get).toHaveBeenCalledWith(key);
    });
  });
});
