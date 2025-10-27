/**
 * Role configuration with Discord ID and name
 */
export interface RoleConfig {
  id: string;
  name: string;
}

/**
 * Channel configuration with Discord ID and name
 */
export interface ChannelConfig {
  id: string;
  name: string;
}

/**
 * Channels configuration structure
 */
export interface ChannelsConfig {
  general: ChannelConfig | null;
  announcements: ChannelConfig | null;
  league_chat: ChannelConfig | null;
  tournament_chat: ChannelConfig | null;
  logs: ChannelConfig | null;
}

/**
 * Roles configuration structure - supports multiple roles per type
 */
export interface RolesConfig {
  admin: RoleConfig[];
  moderator: RoleConfig[];
  member: RoleConfig[];
  league_manager: RoleConfig[];
  tournament_manager: RoleConfig[];
}

/**
 * Features configuration structure
 */
export interface FeaturesConfig {
  league_management: boolean;
  tournament_mode: boolean;
  auto_roles: boolean;
  statistics: boolean;
  leaderboards: boolean;
}

/**
 * Permissions configuration structure
 */
export interface PermissionsConfig {
  create_leagues: string[];
  manage_teams: string[];
  view_stats: string[];
  manage_tournaments: string[];
  manage_roles: string[];
  view_logs: string[];
}

/**
 * Display configuration structure
 */
export interface DisplayConfig {
  show_leaderboards: boolean;
  show_member_count: boolean;
  theme: 'default' | 'dark' | 'light';
  command_prefix: string;
}

/**
 * Complete guild settings structure
 */
export interface GuildSettings {
  channels: ChannelsConfig;
  roles: RolesConfig;
  features: FeaturesConfig;
  permissions: PermissionsConfig;
  display: DisplayConfig;
}
