import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IConfigurationService } from '../interfaces/configuration.interface';

/**
 * InAppConfigurationService - In-app implementation of IConfigurationService
 *
 * Wraps NestJS ConfigService to provide configuration access through the
 * infrastructure abstraction interface. This enables dependency inversion
 * and allows configuration to be swapped with external configuration services
 * (Consul, etcd, AWS Systems Manager, etc.) in the future.
 *
 * Implementation: Uses @nestjs/config ConfigService internally
 */
@Injectable()
export class InAppConfigurationService implements IConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get a configuration value by key path
   * @param key - Configuration key path (e.g., 'discord.botToken', 'throttler.ttl')
   * @param defaultValue - Optional default value if key is not found
   * @returns Configuration value or undefined if not found and no default provided
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      // ConfigService.get() accepts default as second parameter
      if (defaultValue !== undefined) {
        return this.configService.get<T>(key, defaultValue);
      }
      return this.configService.get<T>(key);
    } catch {
      // ConfigService.get() should not throw, but handle errors gracefully
      return defaultValue;
    }
  }
}
