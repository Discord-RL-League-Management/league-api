/**
 * Normalized ranked playlist performance data extracted from tracker.gg API segments
 */
export interface PlaylistData {
  rank: string | null;
  rankValue: number | null;
  division: string | null;
  divisionValue: number | null;
  rating: number | null; // Matchmaking Rating (MMR)
  matchesPlayed: number | null;
  winStreak: number | null;
  peakRating: number | null; // Current season peak from playlist segment
  allTimePeakRating: number | null; // All-time peak from peak-rating segments
}

/**
 * Aggregates all ranked playlist data for a specific competitive season
 */
export interface SeasonData {
  seasonNumber: number;
  seasonName: string | null;
  playlist1v1: PlaylistData | null;
  playlist2v2: PlaylistData | null;
  playlist3v3: PlaylistData | null;
  playlist4v4: PlaylistData | null;
}

/**
 * Raw response structure from tracker.gg API scraping operations
 */
export interface ScrapedTrackerData {
  platformInfo: {
    platformSlug: string;
    platformUserId: string;
    platformUserHandle: string;
  };
  userInfo: {
    userId: number;
    isPremium: boolean;
  };
  metadata: {
    lastUpdated: string;
    playerId: number;
    currentSeason: number;
  };
  segments: TrackerSegment[];
  availableSegments: Array<{
    type: string;
    attributes: {
      season: number;
    };
    metadata: {
      name: string;
    };
  }>;
}

/**
 * Individual data segment from tracker.gg API response (allows null stat fields for missing data)
 */
export interface TrackerSegment {
  type: string;
  attributes: {
    playlistId?: number;
    season?: number;
    [key: string]: any;
  };
  metadata: {
    name: string;
    [key: string]: any;
  };
  stats: {
    [key: string]: {
      value: any;
      displayValue: string;
      metadata?: {
        name?: string;
        iconUrl?: string;
        tierName?: string;
        [key: string]: any;
      };
      [key: string]: any;
    } | null;
  };
  expiryDate: string;
}
