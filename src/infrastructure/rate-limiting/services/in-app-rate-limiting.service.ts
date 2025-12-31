import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { IRateLimitingService } from '../interfaces/rate-limiting.interface';
import type { Cache } from 'cache-manager';

/**
 * InAppRateLimitingService - In-app implementation of IRateLimitingService
 *
 * Wraps cache-manager to provide rate limiting through the infrastructure
 * abstraction interface. This enables dependency inversion and allows rate limiting
 * to be swapped with external API gateway rate limiting in the future.
 *
 * Implementation: Uses cache-manager (same storage as @nestjs/throttler) internally
 */
@Injectable()
export class InAppRateLimitingService implements IRateLimitingService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Check if a key is rate limited
   * @param key - Unique identifier for the rate limit (e.g., IP address, user ID, API key)
   * @param limit - Maximum number of requests allowed
   * @param ttl - Time-to-live in milliseconds for the rate limit window (unused in check, used in increment)
   * @returns true if rate limited (should be rejected), false if allowed
   */
  async isRateLimited(
    key: string,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    void ttl; // Parameter required by interface but unused in this implementation
    try {
      const count = await this.cache.get<number>(key);
      if (count === undefined) {
        return false; // No count means not rate limited
      }
      // Rate limited when count reaches or exceeds limit (inclusive boundary)
      return count >= limit;
    } catch {
      // On cache error, allow the request (fail open)
      return false;
    }
  }

  /**
   * Increment the counter for a key and return the current count
   * @param key - Unique identifier for the rate limit
   * @param ttl - Time-to-live in milliseconds for the rate limit window
   * @returns Current count after increment
   */
  async increment(key: string, ttl: number): Promise<number> {
    try {
      const currentCount = await this.cache.get<number>(key);
      const newCount = (currentCount ?? 0) + 1;
      await this.cache.set(key, newCount, ttl);
      return newCount;
    } catch {
      // On cache error, return 1 as fallback
      return 1;
    }
  }
}
