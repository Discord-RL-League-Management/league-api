-- CreateTable: PlayerLeagueRating (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "player_league_ratings" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "ratingSystem" VARCHAR(50) NOT NULL,
    "currentRating" DECIMAL(10,2) NOT NULL,
    "ratingData" JSONB NOT NULL,
    "initialRating" DECIMAL(10,2) NOT NULL,
    "peakRating" DECIMAL(10,2),
    "peakRatingAt" TIMESTAMP(3),
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "lastMatchId" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_league_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE UNIQUE INDEX IF NOT EXISTS "player_league_ratings_playerId_leagueId_key" ON "player_league_ratings"("playerId", "leagueId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "player_league_ratings_leagueId_currentRating_idx" ON "player_league_ratings"("leagueId", "currentRating");

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_league_ratings_playerId_fkey') THEN
        ALTER TABLE "player_league_ratings" ADD CONSTRAINT "player_league_ratings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_league_ratings_leagueId_fkey') THEN
        ALTER TABLE "player_league_ratings" ADD CONSTRAINT "player_league_ratings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

