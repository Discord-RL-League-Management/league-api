-- Migration: Add rawRating field to PlayerLeagueRating
-- This migration adds rawRating column to store unrounded calculated MMR values
-- alongside the rounded currentRating (salary). Also adds indexes for querying.

-- Step 1: Add rawRating column (nullable for backward compatibility)
ALTER TABLE "player_league_ratings" ADD COLUMN "rawRating" DECIMAL(10,2);

-- Step 2: Create index on [leagueId, rawRating] for querying raw ratings per league
CREATE INDEX "player_league_ratings_leagueId_rawRating_idx" ON "player_league_ratings"("leagueId", "rawRating");

-- Step 3: Create index on [leagueId, lastUpdatedAt] for querying recent updates per league
CREATE INDEX "player_league_ratings_leagueId_lastUpdatedAt_idx" ON "player_league_ratings"("leagueId", "lastUpdatedAt");
