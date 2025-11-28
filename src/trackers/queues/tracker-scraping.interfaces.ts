/**
 * Data passed to a scraping job
 */
export interface ScrapingJobData {
  trackerId: string;
}

/**
 * Result returned from a scraping job
 */
export interface ScrapingJobResult {
  success: boolean;
  seasonsScraped: number;
  seasonsFailed: number;
  error?: string;
}
