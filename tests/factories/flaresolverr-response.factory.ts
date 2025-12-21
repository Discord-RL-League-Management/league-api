/**
 * FlareSolverr Response Factory
 *
 * Synthetic data factory for creating FlareSolverr API responses.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

import type { ScrapedTrackerData } from '@/trackers/interfaces/scraper.interfaces';

/**
 * FlareSolverr response structure
 */
export interface FlareSolverrResponse {
  status: string;
  message?: string;
  solution?: {
    url?: string;
    status?: number;
    cookies?: Array<Record<string, any>>;
    userAgent?: string;
    headers?: Record<string, string>;
    response?: string; // HTML string containing JSON in <pre> tag
    startTimestamp?: number;
    endTimestamp?: number;
  };
  version?: string;
}

/**
 * Creates a FlareSolverr response with HTML wrapper containing tracker.gg JSON
 *
 * @param trackerData - The tracker.gg API data to wrap in HTML
 * @param overrides - Optional overrides for FlareSolverr response fields
 * @returns FlareSolverr response object
 */
export function createFlareSolverrResponseWithHtml(
  trackerData: ScrapedTrackerData | Record<string, any>,
  overrides: Partial<FlareSolverrResponse> = {},
): FlareSolverrResponse {
  // Convert tracker data to JSON string (which will be escaped in HTML)
  const jsonString = JSON.stringify(trackerData);

  // Wrap JSON in HTML with <pre> tag (as FlareSolverr does)
  const htmlResponse = `<html><head><meta name="color-scheme" content="light dark"><meta charset="utf-8"></head><body><pre>${jsonString}</pre><div class="json-formatter-container"></div></body></html>`;

  return {
    status: 'ok',
    message: 'Challenge not detected!',
    solution: {
      url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser',
      status: 200,
      cookies: [],
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      headers: {},
      response: htmlResponse,
      startTimestamp: Date.now(),
      endTimestamp: Date.now() + 1000,
    },
    version: '3.4.6',
    ...overrides,
  };
}

/**
 * Creates a valid FlareSolverr response
 *
 * @param trackerData - The tracker.gg API data
 * @returns FlareSolverr response with HTML wrapper
 */
export function createFlareSolverrResponse(
  trackerData: ScrapedTrackerData | Record<string, any>,
): FlareSolverrResponse {
  return createFlareSolverrResponseWithHtml(trackerData);
}

/**
 * Creates a FlareSolverr error response
 *
 * @param message - Error message
 * @param status - Error status (default: "error")
 * @returns FlareSolverr error response
 */
export function createFlareSolverrErrorResponse(
  message: string = 'Failed to solve challenge',
  status: string = 'error',
): FlareSolverrResponse {
  return {
    status,
    message,
    solution: undefined,
  };
}

/**
 * Creates a FlareSolverr response with missing solution.response field
 *
 * @returns FlareSolverr response without solution.response
 */
export function createFlareSolverrResponseWithMissingSolution(): FlareSolverrResponse {
  return {
    status: 'ok',
    message: 'Challenge not detected!',
    solution: {
      url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser',
      status: 200,
      cookies: [],
      userAgent: 'Mozilla/5.0',
      headers: {},
      // response field is missing
    },
  };
}

/**
 * Creates a FlareSolverr response with HTML missing <pre> tag
 *
 * @returns FlareSolverr response with invalid HTML
 */
export function createFlareSolverrResponseWithoutPreTag(): FlareSolverrResponse {
  const htmlResponse = `<html><head></head><body><div>No JSON here</div></body></html>`;

  return {
    status: 'ok',
    message: 'Challenge not detected!',
    solution: {
      url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser',
      status: 200,
      cookies: [],
      userAgent: 'Mozilla/5.0',
      headers: {},
      response: htmlResponse,
    },
  };
}

/**
 * Creates a FlareSolverr response with invalid JSON in <pre> tag
 *
 * @returns FlareSolverr response with invalid JSON
 */
export function createFlareSolverrResponseWithInvalidJson(): FlareSolverrResponse {
  const invalidJson = '{ invalid json }';
  const htmlResponse = `<html><head></head><body><pre>${invalidJson}</pre></body></html>`;

  return {
    status: 'ok',
    message: 'Challenge not detected!',
    solution: {
      url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser',
      status: 200,
      cookies: [],
      userAgent: 'Mozilla/5.0',
      headers: {},
      response: htmlResponse,
    },
  };
}
