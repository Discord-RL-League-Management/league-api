import { Injectable } from '@nestjs/common';
import { Tracker, TrackerSeason } from '@prisma/client';

/**
 * TrackerResponseMapperService
 * Single Responsibility: Response transformation for tracker endpoints
 *
 * Transforms tracker data structures to match frontend API contracts
 */
@Injectable()
export class TrackerResponseMapperService {
  /**
   * Transform tracker with seasons to frontend API contract format
   * Single Responsibility: Response transformation for tracker detail endpoint
   *
   * @param tracker - Tracker with optional seasons relationship
   * @returns Transformed tracker detail response matching frontend contract
   */
  transformTrackerDetail(tracker: Tracker & { seasons?: TrackerSeason[] }): {
    tracker: Tracker;
    seasons: TrackerSeason[];
  } {
    const { seasons, ...trackerWithoutSeasons } = tracker;
    return {
      tracker: trackerWithoutSeasons as Tracker,
      seasons: seasons || [],
    };
  }
}
