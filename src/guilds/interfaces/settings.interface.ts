import { JsonValue } from '@prisma/client/runtime/library';

/**
 * Type helper for Prisma JSON fields
 * Prisma stores JSON as Prisma.JsonValue, but we know it conforms to GuildSettings
 */
export type GuildSettingsJson = GuildSettings | JsonValue;

/**
 * Channel configuration with Discord ID and name
 */
export interface ChannelConfig {
  id: string;
  name: string;
}

/**
 * Configuration metadata for versioning and migration tracking
 */
export interface ConfigMetadata {
  version: string; // Semantic version (e.g., "1.0.0")
  schemaVersion: number; // Schema version for migrations
  lastMigrated?: Date;
  migratedBy?: string; // User ID who triggered migration
}

/**
 * Complete guild settings structure
 */
export interface GuildSettings {
  _metadata?: ConfigMetadata; // Versioning info (optional for backward compatibility)
  bot_command_channels: ChannelConfig[];
  register_command_channels?: ChannelConfig[]; // Optional: Specific channels for /register command
  roles?: {
    admin?: Array<{ id: string; name?: string } | string>;
    moderator?: Array<{ id: string; name?: string } | string>;
    member?: Array<{ id: string; name?: string } | string>;
    league_manager?: Array<{ id: string; name?: string } | string>;
    tournament_manager?: Array<{ id: string; name?: string } | string>;
  };
}
