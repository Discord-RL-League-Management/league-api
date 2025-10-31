import { HttpModuleOptions } from '@nestjs/axios';

/**
 * Shared HTTP module configuration
 * Single Responsibility: Centralized HTTP client settings
 */
export const httpModuleOptions: HttpModuleOptions = {
  timeout: 10000, // 10 seconds
  maxRedirects: 5,
};

/**
 * Factory function to get HTTP module options
 * Useful for dynamic configuration if needed
 */
export function getHttpModuleOptions(): HttpModuleOptions {
  return httpModuleOptions;
}
