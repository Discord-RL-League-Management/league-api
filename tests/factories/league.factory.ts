/**
 * League Factory
 *
 * Synthetic data factory for creating test league data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

import { Game, LeagueStatus } from '@prisma/client';

export interface LeagueFactoryData {
  id?: string;
  name?: string;
  description?: string;
  guildId?: string;
  game?: Game;
  status?: LeagueStatus;
  createdBy?: string;
}

/**
 * Creates synthetic league data for testing
 *
 * @param overrides - Optional overrides for default values
 * @returns League data object
 */
export function createLeagueData(
  overrides: LeagueFactoryData = {},
): LeagueFactoryData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);

  return {
    id: `league_${timestamp}_${randomSuffix}`,
    name: `Test League ${randomSuffix}`,
    description: `A test league for testing purposes ${randomSuffix}`,
    guildId: `${timestamp}${randomSuffix}`.padEnd(18, '0').substring(0, 18), // Discord snowflake format
    game: Game.ROCKET_LEAGUE,
    status: LeagueStatus.ACTIVE,
    createdBy: `user_${timestamp}_${randomSuffix}`,
    ...overrides,
  };
}

/**
 * Creates multiple synthetic leagues
 *
 * @param count - Number of leagues to create
 * @returns Array of league data objects
 */
export function createMultipleLeagues(count: number): LeagueFactoryData[] {
  return Array.from({ length: count }, () => createLeagueData());
}
