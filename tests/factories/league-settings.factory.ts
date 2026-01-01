/**
 * League Settings Factory
 *
 * Synthetic data factory for creating test league settings data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 *
 * Creates minimal league settings objects for validation tests.
 * Focuses on membership and skill configs commonly used in tests.
 */

export interface LeagueSettingsTestData {
  membership: {
    requireGuildMembership?: boolean;
    requirePlayerStatus?: boolean;
    allowMultipleLeagues?: boolean;
    cooldownAfterLeave?: number | null;
    registrationOpen?: boolean;
    autoCloseOnFull?: boolean;
    maxPlayers?: number;
  };
  skill: {
    requireTracker?: boolean;
  };
}

/**
 * Creates minimal league settings data for testing
 *
 * @param overrides - Optional overrides for default values
 * @returns League settings test data object
 */
export function createLeagueSettingsData(
  overrides: Partial<LeagueSettingsTestData> = {},
): LeagueSettingsTestData {
  const defaults: LeagueSettingsTestData = {
    membership: {
      requireGuildMembership: false,
      requirePlayerStatus: false,
      allowMultipleLeagues: true,
      cooldownAfterLeave: null,
      registrationOpen: true,
      autoCloseOnFull: false,
    },
    skill: {
      requireTracker: false,
    },
  };

  return {
    membership: {
      ...defaults.membership,
      ...overrides.membership,
    },
    skill: {
      ...defaults.skill,
      ...overrides.skill,
    },
  };
}
