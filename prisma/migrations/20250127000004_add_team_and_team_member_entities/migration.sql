-- CreateEnum: TeamRole
CREATE TYPE "TeamRole" AS ENUM ('CAPTAIN', 'MEMBER', 'SUBSTITUTE');

-- CreateEnum: TeamMembershipStatus
CREATE TYPE "TeamMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateEnum: TeamMembershipType
CREATE TYPE "TeamMembershipType" AS ENUM ('PERMANENT', 'TEMPORARY');

-- CreateTable: Team
CREATE TABLE "teams" (
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

-- CreateTable: TeamMember
CREATE TABLE "team_members" (
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

-- CreateIndex
CREATE INDEX "teams_leagueId_idx" ON "teams"("leagueId");

-- CreateIndex
CREATE INDEX "team_members_playerId_leagueId_status_idx" ON "team_members"("playerId", "leagueId", "status");

-- CreateIndex
CREATE INDEX "team_members_teamId_status_idx" ON "team_members"("teamId", "status");

-- CreateIndex
CREATE INDEX "team_members_playerId_leftAt_idx" ON "team_members"("playerId", "leftAt");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;





