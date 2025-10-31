/**
 * Options for querying guilds with optional relations
 * Single Responsibility: Type definition for flexible guild queries
 */
export interface GuildQueryOptions {
  includeSettings?: boolean;
  includeMembers?: boolean;
  membersLimit?: number;
  includeCount?: boolean;
}

/**
 * Default query options for guild queries
 */
export const defaultGuildQueryOptions: GuildQueryOptions = {
  includeSettings: true,
  includeMembers: false,
  membersLimit: 10,
  includeCount: true,
};
