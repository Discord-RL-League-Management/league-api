/**
 * Cache configuration constants
 */
export const SETTINGS_CACHE_TTL = 300000; // 5 minutes in milliseconds

/**
 * Discord API configuration constants
 */
export const DISCORD_API_TIMEOUT = 10000; // 10 seconds
export const DISCORD_API_RETRY_ATTEMPTS = 3;

/**
 * Validation constants
 */
export const MAX_ROLE_NAME_LENGTH = 100;
export const MAX_CHANNEL_NAME_LENGTH = 100;
export const MAX_COMMAND_PREFIX_LENGTH = 5;

/**
 * Valid configuration values
 */
export const VALID_CHANNEL_TYPES = [
  'general',
  'announcements',
  'league_chat',
  'tournament_chat',
  'logs',
];
export const VALID_ROLE_TYPES = [
  'admin',
  'moderator',
  'member',
  'league_manager',
  'tournament_manager',
];
export const VALID_FEATURES = [
  'league_management',
  'tournament_mode',
  'auto_roles',
  'statistics',
  'leaderboards',
];
export const VALID_PERMISSIONS = [
  'create_leagues',
  'manage_teams',
  'view_stats',
  'manage_tournaments',
  'manage_roles',
  'view_logs',
];
export const VALID_THEMES = ['default', 'dark', 'light'] as const;
