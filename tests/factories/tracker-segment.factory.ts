/**
 * Tracker Segment Factory
 *
 * Synthetic data factory for creating tracker.gg segment data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

import type { TrackerSegment } from '@/trackers/interfaces/scraper.interfaces';

/**
 * Playlist ID to name mapping for factory
 */
const PLAYLIST_NAMES: Record<number, string> = {
  1: 'Ranked Duel 1v1',
  2: 'Ranked Doubles 2v2',
  3: 'Ranked Standard 3v3',
  8: 'Ranked 4v4 Quads',
  10: 'Ranked Duel 1v1',
  11: 'Ranked Doubles 2v2',
  13: 'Ranked Standard 3v3',
  27: 'Hoops',
  28: 'Rumble',
  29: 'Dropshot',
  30: 'Snowday',
  61: 'Ranked 4v4 Quads',
};

/**
 * Creates a playlist segment with specific stats
 *
 * @param playlistId - Playlist ID (1, 2, 3, 8, 10, 11, 13, 61, etc.)
 * @param season - Season number
 * @param statsOverrides - Optional stat value overrides
 * @returns TrackerSegment with playlist data
 */
export function createPlaylistSegment(
  playlistId: number,
  season: number,
  statsOverrides: {
    tier?: { value?: number; metadata?: { name?: string } };
    division?: { value?: number; metadata?: { name?: string } };
    rating?: { value?: number };
    matchesPlayed?: { value?: number };
    winStreak?: { value?: number };
  } = {},
): TrackerSegment {
  const playlistName = PLAYLIST_NAMES[playlistId] || `Playlist ${playlistId}`;

  const defaultTier = {
    value: 19,
    displayValue: '19',
    displayType: 'Number',
    percentile: 99.0,
    displayName: 'Matches',
    displayCategory: 'General',
    category: 'general',
    metadata: {
      iconUrl:
        'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s15rank19.png',
      name: 'Grand Champion I',
      tierName: 'Grand Champion I',
    },
  };

  const defaultDivision = {
    value: 2,
    displayValue: '2',
    displayType: 'Number',
    percentile: 50.0,
    displayName: 'Matches',
    displayCategory: 'General',
    category: 'general',
    metadata: {
      name: 'Division III',
    },
  };

  const defaultRating = {
    value: 1500,
    displayValue: '1,500',
    displayType: 'Number',
    rank: 10000,
    percentile: 99.0,
    displayName: 'Rating',
    displayCategory: 'Skill',
    category: 'skill',
    metadata: {
      iconUrl:
        'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s15rank19.png',
      tierName: 'Grand Champion I',
    },
  };

  const defaultMatchesPlayed = {
    value: 100,
    displayValue: '100',
    displayType: 'Number',
    percentile: 50.0,
    displayName: 'Matches',
    displayCategory: 'Performance',
    category: 'performance',
    metadata: {},
  };

  const defaultWinStreak = {
    value: 2,
    displayValue: '2',
    displayType: 'Number',
    displayName: 'WinStreak',
    displayCategory: 'Performance',
    category: 'performance',
    metadata: {
      type: 'win',
    },
  };

  return {
    type: 'playlist',
    attributes: {
      playlistId,
      season,
    },
    metadata: {
      name: playlistName,
    },
    stats: {
      tier: statsOverrides.tier
        ? { ...defaultTier, ...statsOverrides.tier }
        : defaultTier,
      division: statsOverrides.division
        ? { ...defaultDivision, ...statsOverrides.division }
        : defaultDivision,
      rating: statsOverrides.rating
        ? { ...defaultRating, ...statsOverrides.rating }
        : defaultRating,
      matchesPlayed: statsOverrides.matchesPlayed
        ? { ...defaultMatchesPlayed, ...statsOverrides.matchesPlayed }
        : defaultMatchesPlayed,
      winStreak: statsOverrides.winStreak
        ? { ...defaultWinStreak, ...statsOverrides.winStreak }
        : defaultWinStreak,
    },
    expiryDate: '0001-01-01T00:00:00+00:00',
  };
}

/**
 * Creates an overview segment
 *
 * @param overrides - Optional metadata overrides
 * @returns TrackerSegment with overview data
 */
export function createOverviewSegment(
  overrides: Partial<TrackerSegment> = {},
): TrackerSegment {
  return {
    type: 'overview',
    attributes: {},
    metadata: {
      name: 'Lifetime',
      ...overrides.metadata,
    },
    stats: {
      wins: {
        value: 1000,
        displayValue: '1,000',
        displayType: 'Number',
        rank: 10000,
        percentile: 90.0,
        displayName: 'Wins',
        displayCategory: 'Performance',
        category: 'performance',
        metadata: {},
      },
      goals: {
        value: 5000,
        displayValue: '5,000',
        displayType: 'Number',
        rank: 5000,
        percentile: 95.0,
        displayName: 'Goals',
        displayCategory: 'Performance',
        category: 'performance',
        metadata: {},
      },
    },
    expiryDate: '0001-01-01T00:00:00+00:00',
    ...overrides,
  };
}

/**
 * Creates a generic tracker segment
 *
 * @param overrides - Optional segment data overrides
 * @returns TrackerSegment
 */
export function createTrackerSegment(
  overrides: Partial<TrackerSegment> = {},
): TrackerSegment {
  return {
    type: 'playlist',
    attributes: {
      playlistId: 1,
      season: 34,
    },
    metadata: {
      name: 'Ranked Duel 1v1',
    },
    stats: {},
    expiryDate: '0001-01-01T00:00:00+00:00',
    ...overrides,
  };
}

/**
 * Creates a segment with specific stat values
 *
 * @param type - Segment type (playlist, overview, etc.)
 * @param attributes - Segment attributes
 * @param stats - Segment stats object
 * @returns TrackerSegment with specified stats
 */
export function createSegmentWithStats(
  type: string,
  attributes: Record<string, any>,
  stats: TrackerSegment['stats'],
): TrackerSegment {
  const playlistId =
    type === 'playlist' && typeof attributes.playlistId === 'number'
      ? attributes.playlistId
      : undefined;
  return {
    type,
    attributes,
    metadata: {
      name:
        type === 'playlist' && playlistId !== undefined
          ? PLAYLIST_NAMES[playlistId] || 'Unknown'
          : type,
    },
    stats,
    expiryDate: '0001-01-01T00:00:00+00:00',
  };
}

/**
 * Creates a playlist segment with invalid stats structure (violates schema)
 *
 * @param playlistId - Playlist ID
 * @param season - Season number
 * @returns TrackerSegment with invalid stats structure that fails schema validation
 */
export function createPlaylistSegmentWithInvalidStats(
  playlistId: number,
  season: number,
): TrackerSegment {
  return {
    type: 'playlist',
    attributes: {
      playlistId,
      season,
    },
    metadata: {
      name: PLAYLIST_NAMES[playlistId] || `Playlist ${playlistId}`,
    },
    stats: {
      // Invalid: tier is a string instead of an object, which violates schema
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tier: 'invalid' as any,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      division: 'invalid' as any,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      rating: 'invalid' as any,
    },
    expiryDate: '0001-01-01T00:00:00+00:00',
  };
}

/**
 * Creates a playlist segment with null stat values
 *
 * @param playlistId - Playlist ID
 * @param season - Season number
 * @returns TrackerSegment with null stat values
 */
export function createPlaylistSegmentWithNullStats(
  playlistId: number,
  season: number,
): TrackerSegment {
  return {
    type: 'playlist',
    attributes: {
      playlistId,
      season,
    },
    metadata: {
      name: PLAYLIST_NAMES[playlistId] || `Playlist ${playlistId}`,
    },
    stats: {
      tier: null,
      division: null,
      rating: null,
      matchesPlayed: null,
      winStreak: null,
    },
    expiryDate: '0001-01-01T00:00:00+00:00',
  };
}

/**
 * Creates multiple playlist segments for all ranked playlists
 *
 * @param season - Season number
 * @returns Array of TrackerSegment for all ranked playlists
 */
export function createAllRankedPlaylistSegments(
  season: number = 34,
): TrackerSegment[] {
  return [
    createPlaylistSegment(1, season), // Primary 1v1
    createPlaylistSegment(2, season), // Primary 2v2
    createPlaylistSegment(3, season), // Primary 3v3
    createPlaylistSegment(8, season), // Primary 4v4
  ];
}

/**
 * Creates playlist segments using alternative playlist IDs
 *
 * @param season - Season number
 * @returns Array of TrackerSegment with alternative IDs
 */
export function createAlternativePlaylistSegments(
  season: number = 34,
): TrackerSegment[] {
  return [
    createPlaylistSegment(10, season), // Alternative 1v1
    createPlaylistSegment(11, season), // Alternative 2v2
    createPlaylistSegment(13, season), // Alternative 3v3
    createPlaylistSegment(61, season), // Alternative 4v4
  ];
}
