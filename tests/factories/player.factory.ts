/**
 * Player Factory
 *
 * Synthetic data factory for creating test player data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

import { PlayerStatus } from '@prisma/client';

export interface PlayerTestData {
  id?: string;
  userId?: string;
  guildId?: string;
  status?: PlayerStatus;
  lastLeftLeagueAt?: Date | null;
}

/**
 * Creates synthetic player data for testing
 *
 * @param overrides - Optional overrides for default values
 * @returns Player test data object
 */
export function createPlayerTestData(
  overrides: PlayerTestData = {},
): PlayerTestData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);

  return {
    id: `player_${timestamp}_${randomSuffix}`,
    userId: `user_${timestamp}_${randomSuffix}`,
    guildId: `guild_${timestamp}_${randomSuffix}`,
    status: PlayerStatus.ACTIVE,
    lastLeftLeagueAt: null,
    ...overrides,
  };
}
