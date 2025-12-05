-- CreateEnum: MatchStatus (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchStatus') THEN
        CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FORFEIT');
    END IF;
END $$;

-- CreateEnum: MatchParticipantType (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchParticipantType') THEN
        CREATE TYPE "MatchParticipantType" AS ENUM ('TEAM_MEMBER', 'SUBSTITUTE', 'GUEST');
    END IF;
END $$;

-- CreateTable: Match (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "matches" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT,
    "leagueId" TEXT NOT NULL,
    "round" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "playedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MatchParticipant (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "match_participants" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "participantType" "MatchParticipantType" NOT NULL DEFAULT 'TEAM_MEMBER',
    "teamMemberId" TEXT,
    "isWinner" BOOLEAN NOT NULL,
    "score" INTEGER,
    "goals" INTEGER,
    "assists" INTEGER,
    "saves" INTEGER,
    "shots" INTEGER,
    "wasSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "substituteReason" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "matches_tournamentId_idx" ON "matches"("tournamentId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "matches_leagueId_idx" ON "matches"("leagueId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "match_participants_playerId_matchId_idx" ON "match_participants"("playerId", "matchId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "match_participants_teamId_matchId_idx" ON "match_participants"("teamId", "matchId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "match_participants_playerId_wasSubstitute_idx" ON "match_participants"("playerId", "wasSubstitute");

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_tournamentId_fkey') THEN
        ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'matches_leagueId_fkey') THEN
        ALTER TABLE "matches" ADD CONSTRAINT "matches_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_matchId_fkey') THEN
        ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_playerId_fkey') THEN
        ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_teamId_fkey') THEN
        ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_teamMemberId_fkey') THEN
        ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

