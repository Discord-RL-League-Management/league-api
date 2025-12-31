/**
 * NoOpCachingService Unit Tests
 *
 * Tests for no-op caching service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NoOpCachingService } from '@/infrastructure/caching/services/no-op-caching.service';

describe('NoOpCachingService', () => {
  let service: NoOpCachingService;

  beforeEach(() => {
    service = new NoOpCachingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should_return_undefined_when_get_called', async () => {
      const key = 'test-key';

      const result = await service.get<string>(key);

      expect(result).toBeUndefined();
    });

    it('should_return_undefined_for_any_key', async () => {
      const key1 = 'key1';
      const key2 = 'key2';

      const result1 = await service.get<string>(key1);
      const result2 = await service.get<number>(key2);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('should_return_undefined_for_different_types', async () => {
      const key = 'test-key';

      const stringResult = await service.get<string>(key);
      const numberResult = await service.get<number>(key);
      const objectResult = await service.get<{ data: string }>(key);

      expect(stringResult).toBeUndefined();
      expect(numberResult).toBeUndefined();
      expect(objectResult).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should_do_nothing_when_set_called', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await expect(service.set(key, value)).resolves.toBeUndefined();
    });

    it('should_do_nothing_when_set_called_with_ttl', async () => {
      const key = 'test-key';
      const value = 'test value';
      const ttl = 5000;

      await expect(service.set(key, value, ttl)).resolves.toBeUndefined();
    });

    it('should_do_nothing_for_different_value_types', async () => {
      const key = 'test-key';

      await expect(service.set(key, 'string')).resolves.toBeUndefined();
      await expect(service.set(key, 42)).resolves.toBeUndefined();
      await expect(
        service.set(key, { nested: 'object' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('should_do_nothing_when_del_called', async () => {
      const key = 'test-key';

      await expect(service.del(key)).resolves.toBeUndefined();
    });

    it('should_do_nothing_for_any_key', async () => {
      const key1 = 'key1';
      const key2 = 'non-existent-key';

      await expect(service.del(key1)).resolves.toBeUndefined();
      await expect(service.del(key2)).resolves.toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should_do_nothing_when_reset_called', async () => {
      await expect(service.reset()).resolves.toBeUndefined();
    });

    it('should_do_nothing_when_reset_called_multiple_times', async () => {
      await expect(service.reset()).resolves.toBeUndefined();
      await expect(service.reset()).resolves.toBeUndefined();
      await expect(service.reset()).resolves.toBeUndefined();
    });
  });
});

