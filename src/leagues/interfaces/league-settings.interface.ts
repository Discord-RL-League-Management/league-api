import { JsonValue } from '@prisma/client/runtime/library';

/**
 * Type helper for Prisma JSON fields
 * Prisma stores JSON as Prisma.JsonValue, but we know it conforms to LeagueConfiguration
 */
export type LeagueConfigurationJson = LeagueConfiguration | JsonValue;

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
 * Membership configuration options
 */
export interface MembershipConfig {
  // Access Control
  joinMethod: 'OPEN' | 'INVITE_ONLY' | 'APPLICATION';
  requiresApproval: boolean;
  allowSelfRegistration: boolean;
  
  // Capacity
  maxPlayers?: number | null;
  minPlayers?: number | null;
  maxTeams?: number | null;
  
  // Registration Windows
  registrationOpen: boolean;
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  autoCloseOnFull: boolean;
  
  // Eligibility Requirements
  requireGuildMembership: boolean;
  requirePlayerStatus: boolean;
  skillRequirements?: {
    minSkill?: number;
    maxSkill?: number;
    skillMetric: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM';
  } | null;
  
  // Restrictions
  allowMultipleLeagues: boolean;
  cooldownAfterLeave?: number | null;
}

/**
 * Game association configuration (optional)
 */
export interface GameConfig {
  gameType?: 'ROCKET_LEAGUE' | 'DOTA_2' | null;
  platform?: Array<'STEAM' | 'EPIC' | 'XBL' | 'PSN' | 'SWITCH'> | null;
}

/**
 * Skill/Division configuration (optional)
 */
export interface SkillConfig {
  isSkillBased: boolean;
  skillMetric?: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM' | null;
  minSkillLevel?: number | null;
  maxSkillLevel?: number | null;
  requireTracker: boolean;
  trackerPlatforms?: Array<string> | null;
}

/**
 * Visibility & Access configuration
 */
export interface VisibilityConfig {
  isPublic: boolean;
  showInDirectory: boolean;
  allowSpectators: boolean;
}

/**
 * Administrative configuration
 */
export interface AdministrationConfig {
  adminRoles?: Array<string>;
  allowPlayerReports: boolean;
  allowSuspensions: boolean;
  allowBans: boolean;
}

/**
 * Complete league configuration structure
 */
export interface LeagueConfiguration {
  _metadata?: ConfigMetadata; // Versioning info (optional for backward compatibility)
  membership: MembershipConfig;
  game: GameConfig;
  skill: SkillConfig;
  visibility: VisibilityConfig;
  administration: AdministrationConfig;
}


