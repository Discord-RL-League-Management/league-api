/**
 * IConfigurationService - Interface for configuration access operations
 *
 * Abstracts configuration access to enable dependency inversion and external configuration service integration.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations (e.g., @nestjs/config ConfigService), enabling configuration to be
 * handled by an external configuration service (Consul, etcd, AWS Systems Manager, etc.)
 * when scaling to microservices architecture.
 *
 * Future extraction target: Configuration Service (configuration managed by external config service)
 */
export interface IConfigurationService {
  /**
   * Get a configuration value by key path
   * @param key - Configuration key path (e.g., 'discord.botToken', 'throttler.ttl')
   * @param defaultValue - Optional default value if key is not found
   * @returns Configuration value or undefined if not found and no default provided
   */
  get<T>(key: string, defaultValue?: T): T | undefined;
}
