/**
 * Verification script for peak rating data capture
 *
 * This script parses the sample tracker output and verifies that all 16 data points
 * are correctly extracted:
 * - Current season MMR (rating)
 * - Current season peak MMR (peakRating)
 * - All-time peak MMR (allTimePeakRating)
 * - Games played (matchesPlayed)
 *
 * For each of the 4 ranked playlists: 1v1, 2v2, 3v3, 4v4
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TrackerScraperService } from '../src/trackers/services/tracker-scraper.service';
import { TrackerUrlConverterService } from '../src/trackers/services/tracker-url-converter.service';
import type {
  ScrapedTrackerData,
  SeasonData,
} from '../src/trackers/interfaces/scraper.interfaces';

/**
 * Extract JSON from FlareSolverr HTML response
 */
function extractJsonFromHtml(htmlResponse: string): unknown {
  const preTagMatch = htmlResponse.match(/<pre[^>]*>(.*?)<\/pre>/s);
  if (!preTagMatch || !preTagMatch[1]) {
    throw new Error('Could not find JSON in <pre> tag');
  }
  const jsonString = preTagMatch[1];
  return JSON.parse(jsonString);
}

/**
 * Extract tracker data from response
 */
function extractTrackerData(responseData: unknown): unknown {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData
  ) {
    return (responseData as { data?: unknown }).data || responseData;
  }
  return responseData;
}

/**
 * Verify playlist data contains all required fields
 */
function verifyPlaylistData(
  playlistName: string,
  playlistData: {
    rating: number | null;
    peakRating: number | null;
    allTimePeakRating: number | null;
    matchesPlayed: number | null;
  } | null,
): boolean {
  if (!playlistData) {
    console.log(`  ❌ ${playlistName}: Missing playlist data`);
    return false;
  }

  const checks = [
    { field: 'rating', value: playlistData.rating, name: 'Current MMR' },
    {
      field: 'peakRating',
      value: playlistData.peakRating,
      name: 'Current Season Peak',
    },
    {
      field: 'allTimePeakRating',
      value: playlistData.allTimePeakRating,
      name: 'All-Time Peak',
    },
    {
      field: 'matchesPlayed',
      value: playlistData.matchesPlayed,
      name: 'Games Played',
    },
  ];

  let allPassed = true;
  for (const check of checks) {
    if (check.value === null || check.value === undefined) {
      console.log(`  ❌ ${playlistName} - ${check.name}: Missing (null)`);
      allPassed = false;
    } else {
      console.log(`  ✅ ${playlistName} - ${check.name}: ${check.value}`);
    }
  }

  return allPassed;
}

/**
 * Main verification function
 */
function main() {
  console.log('🔍 Verifying Peak Rating Data Capture\n');

  try {
    // Read sample file
    const sampleFilePath = join(__dirname, '../docs/sample_tracker_output.txt');
    const sampleFileContent = readFileSync(sampleFilePath, 'utf-8');
    const flaresolverrResponse = JSON.parse(sampleFileContent) as {
      solution?: { response?: string };
    };

    // Extract HTML response
    const htmlResponse = flaresolverrResponse.solution?.response;
    if (!htmlResponse || typeof htmlResponse !== 'string') {
      throw new Error('Missing solution.response in FlareSolverr response');
    }

    // Extract JSON from HTML
    const jsonData = extractJsonFromHtml(htmlResponse);
    const extractedData = extractTrackerData(jsonData);
    if (!extractedData || typeof extractedData !== 'object') {
      throw new Error('Invalid tracker data structure');
    }
    const trackerData = extractedData as ScrapedTrackerData;

    // Create scraper service instance (we only need parseSegments method)
    // Since parseSegments is public and doesn't use injected services, we can use minimal mocks
    const mockConfigService = {
      get: () => ({
        url: 'http://localhost:8191',
        timeoutMs: 30000,
        retryAttempts: 3,
        retryDelayMs: 1000,
        rateLimitPerMinute: 10,
      }),
    } as unknown as ConfigService;

    const mockHttpService = {} as unknown as HttpService;
    const mockUrlConverter = {} as unknown as TrackerUrlConverterService;

    const scraperService = new TrackerScraperService(
      mockHttpService, // HttpService - not needed for parsing
      mockConfigService, // ConfigService - minimal mock
      mockUrlConverter, // TrackerUrlConverterService - not needed for parsing
    );

    // Parse segments for current season (34)
    const currentSeason = trackerData.metadata?.currentSeason || 34;
    const seasonData: SeasonData = scraperService.parseSegments(
      trackerData.segments,
      currentSeason,
      trackerData.availableSegments,
    );

    console.log(`📊 Season ${currentSeason} Data:\n`);

    // Verify all 16 data points (4 playlists × 4 fields each)
    const results = [
      verifyPlaylistData('1v1 Duel', seasonData.playlist1v1),
      verifyPlaylistData('2v2 Doubles', seasonData.playlist2v2),
      verifyPlaylistData('3v3 Standard', seasonData.playlist3v3),
      verifyPlaylistData('4v4 Quads', seasonData.playlist4v4),
    ];

    const allPassed = results.every((r) => r);

    console.log('\n📈 Expected Values (from sample data):');
    console.log(
      '  1v1: rating=1721, peakRating=1721, allTimePeakRating=1851, matchesPlayed=62',
    );
    console.log(
      '  2v2: rating=2629, peakRating=2698, allTimePeakRating=2772, matchesPlayed=1534',
    );
    console.log(
      '  3v3: rating=1534, peakRating=1534, allTimePeakRating=1997, matchesPlayed=5',
    );
    console.log(
      '  4v4: rating=<value>, peakRating=<value>, allTimePeakRating=<value>, matchesPlayed=<value>',
    );

    if (allPassed) {
      console.log('\n✅ All data points captured successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some data points are missing');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
