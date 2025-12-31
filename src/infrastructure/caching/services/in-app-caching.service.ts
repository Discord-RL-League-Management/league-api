import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ICachingService } from '../interfaces/caching.interface';
import type { Cache } from 'cache-manager';

/**
 * InAppCachingService - In-app implementation of ICachingService
 *
 * Wraps cache-manager to provide caching through the infrastructure
 * abstraction interface. This enables dependency inversion and allows caching
 * to be swapped with external cache (Redis, CDN, or API Gateway) in the future.
 *
 * Implementation: Uses @nestjs/cache-manager Cache instance internally
 */
@Injectable()
export class InAppCachingService implements ICachingService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Get a cached value by key
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(key);
    } catch {
      return undefined;
    }
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional time-to-live in milliseconds. If not provided, uses default TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttl);
    } catch {
      // Caching failures should not break the application
    }
  }

  /**
   * Delete a cached value by key
   * @param key - Cache key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch {
      // Cache deletion failures are non-critical
    }
  }

  /**
   * Reset/clear the entire cache
   */
  async reset(): Promise<void> {
    // Reset failures are critical and should propagate
    await this.cache.clear();
  }
}
