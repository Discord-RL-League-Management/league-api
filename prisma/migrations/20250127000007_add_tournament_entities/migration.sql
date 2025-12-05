-- CreateEnum: TournamentStatus (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TournamentStatus') THEN
        CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
END $$;

-- CreateEnum: ParticipantStatus (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParticipantStatus') THEN
        CREATE TYPE "ParticipantStatus" AS ENUM ('ACTIVE', 'ELIMINATED', 'WITHDRAWN');
    END IF;
END $$;

-- CreateTable: Tournament (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "tournaments" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "format" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "maxParticipants" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TournamentParticipant (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,
    "leagueId" TEXT NOT NULL,
    "seed" INTEGER,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "tournaments_leagueId_idx" ON "tournaments"("leagueId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_participants_tournamentId_playerId_key" ON "tournament_participants"("tournamentId", "playerId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE UNIQUE INDEX IF NOT EXISTS "tournament_participants_tournamentId_teamId_key" ON "tournament_participants"("tournamentId", "teamId");

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournaments_leagueId_fkey') THEN
        ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_participants_tournamentId_fkey') THEN
        ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_participants_playerId_fkey') THEN
        ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_participants_teamId_fkey') THEN
        ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_participants_leagueId_fkey') THEN
        ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;








