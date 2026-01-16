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
  version: string;
  schemaVersion: number;
  lastMigrated?: Date;
  migratedBy?: string;
}

/**
 * MMR calculation weights configuration
 */
export interface MmrWeights {
  ones?: number;
  twos?: number;
  threes?: number;
  fours?: number;
}

/**
 * Minimum games played thresholds
 */
export interface MinGamesPlayed {
  ones?: number;
  twos?: number;
  threes?: number;
  fours?: number;
}

/**
 * Ascendancy algorithm weights configuration
 */
export interface AscendancyWeights {
  /**
   * Current MMR weight (Q) - typically 0.25
   */
  current: number;
  /**
   * Peak MMR weight (R) - typically 0.75
   */
  peak: number;
}

/**
 * MMR calculation configuration
 */
export interface MmrCalculationConfig {
  /**
   * Algorithm type: PRESET uses built-in algorithms, CUSTOM uses formula
   */
  algorithm: 'WEIGHTED_AVERAGE' | 'PEAK_MMR' | 'CUSTOM' | 'ASCENDANCY';

  /**
   * For WEIGHTED_AVERAGE algorithm
   */
  weights?: MmrWeights;

  /**
   * Minimum games played thresholds (only counts playlists with enough games)
   */
  minGamesPlayed?: MinGamesPlayed;

  /**
   * For CUSTOM algorithm - the formula string
   * Available variables:
   * - ones, twos, threes, fours (MMR values)
   * - onesGames, twosGames, threesGames, foursGames (games played)
   * - totalGames (sum of all games)
   * Available functions: Math.* functions (abs, max, min, sqrt, pow, etc.)
   *
   * Example: "(ones * 0.2 + twos * 0.3 + threes * 0.4 + fours * 0.1) / (onesGames > 50 ? 1 : 0.5)"
   */
  customFormula?: string;

  /**
   * For ASCENDANCY algorithm - weights for Current vs Peak MMR
   * Defaults to current=0.25, peak=0.75 if not provided
   */
  ascendancyWeights?: AscendancyWeights;

  /**
   * Formula validation result (stored after successful validation)
   */
  formulaValidated?: boolean;
  formulaValidationError?: string;
}

/**
 * Tracker processing configuration
 */
export interface TrackerProcessingConfig {
  enabled: boolean;
}

/**
 * Complete guild settings structure
 */
export interface GuildSettings {
  _metadata?: ConfigMetadata;
  bot_command_channels: ChannelConfig[];
  register_command_channels?: ChannelConfig[];
  test_command_channels?: ChannelConfig[];
  public_command_channels?: ChannelConfig[];
  staff_command_channels?: ChannelConfig[];
  roles?: {
    admin?: Array<{ id: string; name?: string } | string>;
    moderator?: Array<{ id: string; name?: string } | string>;
    member?: Array<{ id: string; name?: string } | string>;
    league_manager?: Array<{ id: string; name?: string } | string>;
    tournament_manager?: Array<{ id: string; name?: string } | string>;
  };
  mmrCalculation?: MmrCalculationConfig;
  trackerProcessing?: TrackerProcessingConfig;
}
