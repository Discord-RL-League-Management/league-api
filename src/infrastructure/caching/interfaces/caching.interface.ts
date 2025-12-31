import type { InjectionToken } from '@nestjs/common';

/**
 * ICachingService - Interface for caching operations
 *
 * Abstracts caching functionality to enable dependency inversion and gateway extraction.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations (e.g., @nestjs/cache-manager), enabling caching to be handled by
 * an external cache (Redis, CDN, or API Gateway) when scaling to microservices architecture.
 *
 * Future extraction target: API Gateway/CDN (caching handled at gateway/CDN layer)
 */
export interface ICachingService {
  /**
   * Get a cached value by key
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional time-to-live in milliseconds. If not provided, uses default TTL
   */
  set(key: string, value: unknown, ttl?: number): Promise<void>;

  /**
   * Delete a cached value by key
   * @param key - Cache key to delete
   */
  del(key: string): Promise<void>;

  /**
   * Reset/clear the entire cache
   */
  reset(): Promise<void>;
}

export const ICachingService = Symbol(
  'ICachingService',
) as InjectionToken<ICachingService>;
