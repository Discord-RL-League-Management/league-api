/**
 * InAppCachingService Unit Tests
 *
 * Tests for in-app caching service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InAppCachingService } from '@/infrastructure/caching/services/in-app-caching.service';
import type { Cache } from 'cache-manager';

describe('InAppCachingService', () => {
  let service: InAppCachingService;
  let mockCache: Cache;

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      reset: vi.fn(),
      store: {
        keys: vi.fn(),
      },
    } as unknown as Cache;

    service = new InAppCachingService(mockCache);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should_return_cached_value_when_key_exists', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      vi.mocked(mockCache.get).mockResolvedValue(value);

      const result = await service.get<typeof value>(key);

      expect(result).toEqual(value);
      expect(mockCache.get).toHaveBeenCalledWith(key);
    });

    it('should_return_undefined_when_key_not_found', async () => {
      const key = 'non-existent-key';
      vi.mocked(mockCache.get).mockResolvedValue(undefined);

      const result = await service.get<string>(key);

      expect(result).toBeUndefined();
      expect(mockCache.get).toHaveBeenCalledWith(key);
    });

    it('should_handle_string_values', async () => {
      const key = 'string-key';
      const value = 'test string';
      vi.mocked(mockCache.get).mockResolvedValue(value);

      const result = await service.get<string>(key);

      expect(result).toBe(value);
    });

    it('should_handle_number_values', async () => {
      const key = 'number-key';
      const value = 42;
      vi.mocked(mockCache.get).mockResolvedValue(value);

      const result = await service.get<number>(key);

      expect(result).toBe(value);
    });

    it('should_handle_object_values', async () => {
      const key = 'object-key';
      const value = { nested: { data: 'test' } };
      vi.mocked(mockCache.get).mockResolvedValue(value);

      const result = await service.get<typeof value>(key);

      expect(result).toEqual(value);
    });
  });

  describe('set', () => {
    it('should_set_value_with_ttl', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 5000; // 5 seconds in milliseconds

      await service.set(key, value, ttl);

      expect(mockCache.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should_set_value_without_ttl', async () => {
      const key = 'test-key';
      const value = 'test value';

      await service.set(key, value);

      expect(mockCache.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should_handle_different_value_types', async () => {
      const key = 'test-key';
      const stringValue = 'string';
      const numberValue = 42;
      const objectValue = { data: 'test' };

      await service.set(key, stringValue);
      expect(mockCache.set).toHaveBeenCalledWith(key, stringValue, undefined);

      await service.set(key, numberValue);
      expect(mockCache.set).toHaveBeenCalledWith(key, numberValue, undefined);

      await service.set(key, objectValue);
      expect(mockCache.set).toHaveBeenCalledWith(key, objectValue, undefined);
    });
  });

  describe('del', () => {
    it('should_delete_cached_value', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(mockCache.del).toHaveBeenCalledWith(key);
    });

    it('should_handle_non_existent_key', async () => {
      const key = 'non-existent-key';
      vi.mocked(mockCache.del).mockResolvedValue(undefined);

      await service.del(key);

      expect(mockCache.del).toHaveBeenCalledWith(key);
    });
  });

  describe('reset', () => {
    it('should_reset_entire_cache', async () => {
      await service.reset();

      expect(mockCache.reset).toHaveBeenCalled();
    });

    it('should_handle_reset_errors_gracefully', async () => {
      vi.mocked(mockCache.reset).mockRejectedValue(new Error('Reset failed'));

      await expect(service.reset()).rejects.toThrow('Reset failed');
    });
  });
});
