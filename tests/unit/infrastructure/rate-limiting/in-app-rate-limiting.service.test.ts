/**
 * InAppRateLimitingService Unit Tests
 *
 * Tests for in-app rate limiting service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InAppRateLimitingService } from '@/infrastructure/rate-limiting/services/in-app-rate-limiting.service';
import type { Cache } from 'cache-manager';

describe('InAppRateLimitingService', () => {
  let service: InAppRateLimitingService;
  let mockCache: Cache;

  beforeEach(() => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
    } as unknown as Cache;

    service = new InAppRateLimitingService(mockCache);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isRateLimited', () => {
    it('should_return_true_when_count_exceeds_limit', async () => {
      const key = 'test-key';
      const limit = 10;
      const ttl = 60000; // 1 minute
      const currentCount = 11;
      vi.mocked(mockCache.get).mockResolvedValue(currentCount);

      const result = await service.isRateLimited(key, limit, ttl);

      expect(result).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith(key);
    });

    it('should_return_false_when_count_below_limit', async () => {
      const key = 'test-key';
      const limit = 10;
      const ttl = 60000;
      const currentCount = 5;
      vi.mocked(mockCache.get).mockResolvedValue(currentCount);

      const result = await service.isRateLimited(key, limit, ttl);

      expect(result).toBe(false);
    });

    it('should_return_true_when_count_equals_limit', async () => {
      const key = 'test-key';
      const limit = 10;
      const ttl = 60000;
      const currentCount = 10;
      vi.mocked(mockCache.get).mockResolvedValue(currentCount);

      const result = await service.isRateLimited(key, limit, ttl);

      expect(result).toBe(true);
    });

    it('should_return_false_when_key_not_found', async () => {
      const key = 'new-key';
      const limit = 10;
      const ttl = 60000;
      vi.mocked(mockCache.get).mockResolvedValue(undefined);

      const result = await service.isRateLimited(key, limit, ttl);

      expect(result).toBe(false);
    });

    it('should_handle_cache_errors_gracefully', async () => {
      const key = 'test-key';
      const limit = 10;
      const ttl = 60000;
      vi.mocked(mockCache.get).mockRejectedValue(new Error('Cache error'));

      const result = await service.isRateLimited(key, limit, ttl);

      // Should return false to allow request when cache fails
      expect(result).toBe(false);
    });
  });

  describe('increment', () => {
    it('should_increment_counter_and_return_count', async () => {
      const key = 'test-key';
      const ttl = 60000;
      const currentCount = 5;
      vi.mocked(mockCache.get).mockResolvedValue(currentCount);
      vi.mocked(mockCache.set).mockResolvedValue(undefined);

      const result = await service.increment(key, ttl);

      expect(result).toBe(6);
      expect(mockCache.set).toHaveBeenCalledWith(key, 6, ttl);
    });

    it('should_initialize_counter_when_key_not_found', async () => {
      const key = 'new-key';
      const ttl = 60000;
      vi.mocked(mockCache.get).mockResolvedValue(undefined);
      vi.mocked(mockCache.set).mockResolvedValue(undefined);

      const result = await service.increment(key, ttl);

      expect(result).toBe(1);
      expect(mockCache.set).toHaveBeenCalledWith(key, 1, ttl);
    });

    it('should_handle_ttl_conversion_correctly', async () => {
      const key = 'test-key';
      const ttl = 5000; // 5 seconds in milliseconds
      vi.mocked(mockCache.get).mockResolvedValue(3);
      vi.mocked(mockCache.set).mockResolvedValue(undefined);

      await service.increment(key, ttl);

      expect(mockCache.set).toHaveBeenCalledWith(key, 4, ttl);
    });

    it('should_handle_cache_errors_gracefully', async () => {
      const key = 'test-key';
      const ttl = 60000;
      vi.mocked(mockCache.get).mockRejectedValue(new Error('Cache error'));

      const result = await service.increment(key, ttl);

      // Should return 1 as fallback when cache fails
      expect(result).toBe(1);
    });
  });
});
