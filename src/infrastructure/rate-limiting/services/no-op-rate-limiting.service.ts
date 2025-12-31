import { Injectable } from '@nestjs/common';
import { IRateLimitingService } from '../interfaces/rate-limiting.interface';

/**
 * NoOpRateLimitingService - No-op implementation of IRateLimitingService
 *
 * Provides a no-op implementation for gateway mode where rate limiting
 * is handled externally by the API gateway. All operations are no-ops
 * that return safe defaults.
 *
 * Implementation: No-op (all operations do nothing)
 */
@Injectable()
export class NoOpRateLimitingService implements IRateLimitingService {
  /**
   * Check if a key is rate limited
   * In gateway mode, rate limiting is handled externally, so always return false
   * @param key - Unique identifier for the rate limit (unused)
   * @param limit - Maximum number of requests allowed (unused)
   * @param ttl - Time-to-live in milliseconds (unused)
   * @returns Always false (never rate limited)
   */
  async isRateLimited(
    key: string,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    void key;
    void limit;
    void ttl;
    await Promise.resolve();
    return false;
  }

  /**
   * Increment the counter for a key and return the current count
   * In gateway mode, rate limiting is handled externally, so always return 0
   * @param key - Unique identifier for the rate limit (unused)
   * @param ttl - Time-to-live in milliseconds (unused)
   * @returns Always 0 (no counting)
   */
  async increment(key: string, ttl: number): Promise<number> {
    void key;
    void ttl;
    await Promise.resolve();
    return 0;
  }
}
