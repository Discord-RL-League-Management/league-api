import { CacheModuleOptions } from '@nestjs/cache-manager';

/**
 * Shared cache module configuration
 * Single Responsibility: Centralized cache settings
 */
export const cacheModuleOptions: CacheModuleOptions = {
  ttl: 300000, // 5 minutes in milliseconds
  max: 1000, // Maximum number of items in cache
};

/**
 * Factory function to get cache module options
 * Useful for dynamic configuration if needed
 */
export function getCacheModuleOptions(): CacheModuleOptions {
  return cacheModuleOptions;
}
