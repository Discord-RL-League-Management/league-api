/**
 * Tracker Factory
 * 
 * Synthetic data factory for creating test tracker data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';

export interface TrackerFactoryData {
  id?: string;
  url?: string;
  game?: Game;
  platform?: GamePlatform;
  username?: string;
  userId?: string;
  guildId?: string;
  scrapingStatus?: TrackerScrapingStatus;
  isDeleted?: boolean;
}

/**
 * Creates synthetic tracker data for testing
 * 
 * @param overrides - Optional overrides for default values
 * @returns Tracker data object
 */
export function createTrackerData(overrides: TrackerFactoryData = {}): TrackerFactoryData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const username = `testuser${randomSuffix}`;
  
  return {
    id: `tracker_${timestamp}_${randomSuffix}`,
    url: `https://rocketleague.tracker.network/rocket-league/profile/steam/${username}/overview`,
    game: Game.ROCKET_LEAGUE,
    platform: GamePlatform.STEAM,
    username,
    userId: `user_${timestamp}_${randomSuffix}`,
    scrapingStatus: TrackerScrapingStatus.PENDING,
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Creates multiple synthetic trackers
 * 
 * @param count - Number of trackers to create
 * @returns Array of tracker data objects
 */
export function createMultipleTrackers(count: number): TrackerFactoryData[] {
  return Array.from({ length: count }, () => createTrackerData());
}

