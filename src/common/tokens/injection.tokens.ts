/**
 * Injection Tokens - Symbol-based tokens for dependency injection
 *
 * This file exports symbol tokens for all custom providers used throughout the application.
 * Using symbols instead of string tokens provides:
 * - Type safety (TypeScript can catch typos)
 * - Better IDE support (autocomplete, refactoring)
 * - Self-documenting code
 * - Prevention of runtime errors from typos
 *
 * All tokens follow the pattern: UPPER_SNAKE_CASE matching the interface name
 */

export const ILEAGUE_SETTINGS_PROVIDER = Symbol('ILeagueSettingsProvider');

export const ILEAGUE_REPOSITORY_ACCESS = Symbol('ILeagueRepositoryAccess');

export const ILEAGUE_MEMBER_ACCESS = Symbol('ILeagueMemberAccess');

export const IGUILD_ACCESS_PROVIDER = Symbol('IGuildAccessProvider');

export const IORGANIZATION_PROVIDER = Symbol('IOrganizationProvider');

export const IORGANIZATION_VALIDATION_PROVIDER = Symbol(
  'IOrganizationValidationProvider',
);

export const ITEAM_PROVIDER = Symbol('ITeamProvider');

export const IORGANIZATION_TEAM_PROVIDER = Symbol('IOrganizationTeamProvider');
