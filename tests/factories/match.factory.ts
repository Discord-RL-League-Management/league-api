/**
 * Match Factory
 * 
 * Synthetic data factory for creating test match data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

import { MatchStatus } from '@prisma/client';

export interface MatchFactoryData {
  id?: string;
  leagueId?: string;
  tournamentId?: string;
  round?: number;
  status?: MatchStatus;
  scheduledAt?: Date | string;
  playedAt?: Date | string;
  winnerId?: string;
}

/**
 * Creates synthetic match data for testing
 * 
 * @param overrides - Optional overrides for default values
 * @returns Match data object
 */
export function createMatchData(overrides: MatchFactoryData = {}): MatchFactoryData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  
  return {
    id: `match_${timestamp}_${randomSuffix}`,
    leagueId: `league_${timestamp}_${randomSuffix}`,
    tournamentId: undefined,
    round: 1,
    status: MatchStatus.SCHEDULED,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    playedAt: undefined,
    winnerId: undefined,
    ...overrides,
  };
}

/**
 * Creates multiple synthetic matches
 * 
 * @param count - Number of matches to create
 * @returns Array of match data objects
 */
export function createMultipleMatches(count: number): MatchFactoryData[] {
  return Array.from({ length: count }, () => createMatchData());
}

