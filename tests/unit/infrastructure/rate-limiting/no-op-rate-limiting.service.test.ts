/**
 * NoOpRateLimitingService Unit Tests
 *
 * Tests for no-op rate limiting service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NoOpRateLimitingService } from '@/infrastructure/rate-limiting/services/no-op-rate-limiting.service';

describe('NoOpRateLimitingService', () => {
  let service: NoOpRateLimitingService;

  beforeEach(() => {
    service = new NoOpRateLimitingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isRateLimited', () => {
    it('should_return_false_when_isRateLimited_called', async () => {
      const key = 'test-key';
      const limit = 10;
      const ttl = 60000;

      const result = await service.isRateLimited(key, limit, ttl);

      expect(result).toBe(false);
    });

    it('should_return_false_for_any_key', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const limit = 5;
      const ttl = 30000;

      const result1 = await service.isRateLimited(key1, limit, ttl);
      const result2 = await service.isRateLimited(key2, limit, ttl);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should_return_false_regardless_of_limit', async () => {
      const key = 'test-key';
      const ttl = 60000;

      const result1 = await service.isRateLimited(key, 1, ttl);
      const result2 = await service.isRateLimited(key, 100, ttl);
      const result3 = await service.isRateLimited(key, 1000, ttl);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should_return_false_regardless_of_ttl', async () => {
      const key = 'test-key';
      const limit = 10;

      const result1 = await service.isRateLimited(key, limit, 1000);
      const result2 = await service.isRateLimited(key, limit, 60000);
      const result3 = await service.isRateLimited(key, limit, 3600000);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('increment', () => {
    it('should_return_zero_when_increment_called', async () => {
      const key = 'test-key';
      const ttl = 60000;

      const result = await service.increment(key, ttl);

      expect(result).toBe(0);
    });

    it('should_return_zero_for_any_key', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const ttl = 30000;

      const result1 = await service.increment(key1, ttl);
      const result2 = await service.increment(key2, ttl);

      expect(result1).toBe(0);
      expect(result2).toBe(0);
    });

    it('should_return_zero_regardless_of_ttl', async () => {
      const key = 'test-key';

      const result1 = await service.increment(key, 1000);
      const result2 = await service.increment(key, 60000);
      const result3 = await service.increment(key, 3600000);

      expect(result1).toBe(0);
      expect(result2).toBe(0);
      expect(result3).toBe(0);
    });

    it('should_return_zero_on_multiple_calls', async () => {
      const key = 'test-key';
      const ttl = 60000;

      const result1 = await service.increment(key, ttl);
      const result2 = await service.increment(key, ttl);
      const result3 = await service.increment(key, ttl);

      expect(result1).toBe(0);
      expect(result2).toBe(0);
      expect(result3).toBe(0);
    });
  });
});

