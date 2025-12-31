import { Injectable } from '@nestjs/common';
import { ICachingService } from '../interfaces/caching.interface';

/**
 * NoOpCachingService - No-op implementation of ICachingService
 *
 * Provides a no-op implementation for gateway mode where caching
 * is handled externally by the API gateway or CDN. All operations
 * are no-ops that return safe defaults.
 *
 * Implementation: No-op (all operations do nothing)
 */
@Injectable()
export class NoOpCachingService implements ICachingService {
  /**
   * Get a cached value by key
   * In gateway mode, caching is handled externally, so always return undefined
   * @param key - Cache key (unused)
   * @returns Always undefined (no cached value)
   */
  async get<T>(key: string): Promise<T | undefined> {
    void key;
    await Promise.resolve();
    return undefined;
  }

  /**
   * Set a value in the cache
   * In gateway mode, caching is handled externally, so this is a no-op
   * @param key - Cache key (unused)
   * @param value - Value to cache (unused)
   * @param ttl - Optional time-to-live (unused)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    void key;
    void value;
    void ttl;
    await Promise.resolve();
  }

  /**
   * Delete a cached value by key
   * In gateway mode, caching is handled externally, so this is a no-op
   * @param key - Cache key to delete (unused)
   */
  async del(key: string): Promise<void> {
    void key;
    await Promise.resolve();
  }

  /**
   * Reset/clear the entire cache
   * In gateway mode, caching is handled externally, so this is a no-op
   */
  async reset(): Promise<void> {
    await Promise.resolve();
  }
}
