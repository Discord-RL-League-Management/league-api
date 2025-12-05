-- CreateEnum: TeamRole (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamRole') THEN
        CREATE TYPE "TeamRole" AS ENUM ('CAPTAIN', 'MEMBER', 'SUBSTITUTE');
    END IF;
END $$;

-- CreateEnum: TeamMembershipStatus (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamMembershipStatus') THEN
        CREATE TYPE "TeamMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');
    END IF;
END $$;

-- CreateEnum: TeamMembershipType (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamMembershipType') THEN
        CREATE TYPE "TeamMembershipType" AS ENUM ('PERMANENT', 'TEMPORARY');
    END IF;
END $$;

-- CreateTable: Team (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "teams" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "tag" VARCHAR(20),
    "description" TEXT,
    "captainId" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 5,
    "minPlayers" INTEGER NOT NULL DEFAULT 2,
    "allowEmergencySubs" BOOLEAN NOT NULL DEFAULT true,
    "maxSubstitutes" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TeamMember (only if doesn't exist - duplicate migration)
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "status" "TeamMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "membershipType" "TeamMembershipType" NOT NULL DEFAULT 'PERMANENT',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "removedBy" VARCHAR(20),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "teams_leagueId_idx" ON "teams"("leagueId");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "team_members_playerId_leagueId_status_idx" ON "team_members"("playerId", "leagueId", "status");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "team_members_teamId_status_idx" ON "team_members"("teamId", "status");

-- CreateIndex (only if doesn't exist - duplicate migration)
CREATE INDEX IF NOT EXISTS "team_members_playerId_leftAt_idx" ON "team_members"("playerId", "leftAt");

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_leagueId_fkey') THEN
        ALTER TABLE "teams" ADD CONSTRAINT "teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_captainId_fkey') THEN
        ALTER TABLE "teams" ADD CONSTRAINT "teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_teamId_fkey') THEN
        ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_playerId_fkey') THEN
        ALTER TABLE "team_members" ADD CONSTRAINT "team_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if doesn't exist - duplicate migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_leagueId_fkey') THEN
        ALTER TABLE "team_members" ADD CONSTRAINT "team_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;








