-- CreateEnum: TrackerScrapingStatus
CREATE TYPE "TrackerScrapingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable: Add unique constraint to Tracker.userId and new scraping fields
ALTER TABLE "trackers" 
  ADD COLUMN IF NOT EXISTS "lastScrapedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scrapingStatus" "TrackerScrapingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "scrapingError" TEXT,
  ADD COLUMN IF NOT EXISTS "scrapingAttempts" INTEGER NOT NULL DEFAULT 0;

-- Create unique index on userId (one-to-one relationship)
CREATE UNIQUE INDEX IF NOT EXISTS "trackers_userId_key" ON "trackers"("userId");

-- Create indexes for scraping fields
CREATE INDEX IF NOT EXISTS "trackers_scrapingStatus_idx" ON "trackers"("scrapingStatus");
CREATE INDEX IF NOT EXISTS "trackers_lastScrapedAt_idx" ON "trackers"("lastScrapedAt");

-- CreateTable: TrackerSeason
CREATE TABLE IF NOT EXISTS "tracker_seasons" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "seasonName" TEXT,
    "playlist1v1" JSONB,
    "playlist2v2" JSONB,
    "playlist3v3" JSONB,
    "playlist4v4" JSONB,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracker_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TrackerScrapingLog
CREATE TABLE IF NOT EXISTS "tracker_scraping_logs" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "status" "TrackerScrapingStatus" NOT NULL,
    "seasonsScraped" INTEGER NOT NULL,
    "seasonsFailed" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "tracker_scraping_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: TrackerSeason indexes
CREATE UNIQUE INDEX IF NOT EXISTS "tracker_seasons_trackerId_seasonNumber_key" ON "tracker_seasons"("trackerId", "seasonNumber");
CREATE INDEX IF NOT EXISTS "tracker_seasons_trackerId_idx" ON "tracker_seasons"("trackerId");
CREATE INDEX IF NOT EXISTS "tracker_seasons_seasonNumber_idx" ON "tracker_seasons"("seasonNumber");

-- CreateIndex: TrackerScrapingLog indexes
CREATE INDEX IF NOT EXISTS "tracker_scraping_logs_trackerId_startedAt_idx" ON "tracker_scraping_logs"("trackerId", "startedAt");
CREATE INDEX IF NOT EXISTS "tracker_scraping_logs_status_idx" ON "tracker_scraping_logs"("status");

-- AddForeignKey: TrackerSeason.trackerId -> Tracker.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_seasons_trackerId_fkey'
    ) THEN
        ALTER TABLE "tracker_seasons" ADD CONSTRAINT "tracker_seasons_trackerId_fkey" 
            FOREIGN KEY ("trackerId") REFERENCES "trackers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: TrackerScrapingLog.trackerId -> Tracker.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_scraping_logs_trackerId_fkey'
    ) THEN
        ALTER TABLE "tracker_scraping_logs" ADD CONSTRAINT "tracker_scraping_logs_trackerId_fkey" 
            FOREIGN KEY ("trackerId") REFERENCES "trackers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

