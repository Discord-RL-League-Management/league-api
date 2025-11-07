/**
 * Configuration version constants
 * Single Responsibility: Version tracking constants
 */

/**
 * Current schema version for migrations
 * Increment when making breaking changes to the configuration structure
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Current semantic version of the configuration format
 * Follows semantic versioning: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes
 * - MINOR: New features (backward compatible)
 * - PATCH: Bug fixes (backward compatible)
 */
export const CURRENT_CONFIG_VERSION = '1.0.0';

/**
 * Registry of migration functions by version
 * Each entry migrates from (version - 1) to version
 */
export type MigrationFunction = (config: any) => Promise<any> | any;

export interface MigrationRegistry {
  [version: number]: MigrationFunction;
}

