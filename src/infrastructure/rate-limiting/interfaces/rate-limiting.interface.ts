import type { InjectionToken } from '@nestjs/common';

/**
 * IRateLimitingService - Interface for rate limiting operations
 *
 * Abstracts rate limiting functionality to enable dependency inversion and gateway extraction.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations (e.g., @nestjs/throttler), enabling rate limiting to be handled by
 * an external API gateway when scaling to microservices architecture.
 *
 * Future extraction target: API Gateway (rate limiting handled at gateway layer)
 */
export interface IRateLimitingService {
  /**
   * Check if a key is rate limited
   * @param key - Unique identifier for the rate limit (e.g., IP address, user ID, API key)
   * @param limit - Maximum number of requests allowed
   * @param ttl - Time-to-live in milliseconds for the rate limit window
   * @returns true if rate limited (should be rejected), false if allowed
   */
  isRateLimited(key: string, limit: number, ttl: number): Promise<boolean>;

  /**
   * Increment the counter for a key and return the current count
   * @param key - Unique identifier for the rate limit
   * @param ttl - Time-to-live in milliseconds for the rate limit window
   * @returns Current count after increment
   */
  increment(key: string, ttl: number): Promise<number>;
}

export const IRateLimitingService = Symbol(
  'IRateLimitingService',
) as InjectionToken<IRateLimitingService>;
