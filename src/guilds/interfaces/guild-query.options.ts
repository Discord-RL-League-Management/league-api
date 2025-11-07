/**
 * Options for querying guilds with optional relations
 * Single Responsibility: Type definition for flexible guild queries
 * 
 * Note: includeSettings is deprecated and ignored. Settings are NOT a Prisma relation
 * and cannot be included in queries. Settings must be fetched separately using
 * GuildSettingsService.getSettings(guildId).
 */
export interface GuildQueryOptions {
  /**
   * @deprecated Settings are NOT a Prisma relation and cannot be included.
   * This option is ignored. Fetch settings separately using GuildSettingsService.
   */
  includeSettings?: boolean;
  includeMembers?: boolean;
  membersLimit?: number;
  includeCount?: boolean;
}

/**
 * Default query options for guild queries
 * 
 * Note: includeSettings is set to true for backward compatibility but is ignored.
 */
export const defaultGuildQueryOptions: GuildQueryOptions = {
  includeSettings: true, // Ignored - kept for backward compatibility
  includeMembers: false,
  membersLimit: 10,
  includeCount: true,
};
