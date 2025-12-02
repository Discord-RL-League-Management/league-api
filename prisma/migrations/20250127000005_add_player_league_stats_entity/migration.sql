-- CreateTable: PlayerLeagueStats
CREATE TABLE "player_league_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "winRate" DECIMAL(5,4) NOT NULL,
    "totalGoals" INTEGER NOT NULL DEFAULT 0,
    "totalAssists" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "totalShots" INTEGER NOT NULL DEFAULT 0,
    "avgGoals" DECIMAL(5,2),
    "avgAssists" DECIMAL(5,2),
    "avgSaves" DECIMAL(5,2),
    "lastMatchAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_league_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_league_stats_playerId_leagueId_key" ON "player_league_stats"("playerId", "leagueId");

-- CreateIndex
CREATE INDEX "player_league_stats_leagueId_wins_idx" ON "player_league_stats"("leagueId", "wins");

-- AddForeignKey
ALTER TABLE "player_league_stats" ADD CONSTRAINT "player_league_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_league_stats" ADD CONSTRAINT "player_league_stats_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;




