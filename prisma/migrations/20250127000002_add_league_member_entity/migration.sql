-- CreateEnum: LeagueMemberStatus
CREATE TYPE "LeagueMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_APPROVAL');

-- CreateEnum: LeagueMemberRole
CREATE TYPE "LeagueMemberRole" AS ENUM ('MEMBER', 'ADMIN', 'MODERATOR');

-- CreateTable
CREATE TABLE "league_members" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" "LeagueMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "LeagueMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "approvedBy" VARCHAR(20),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_members_playerId_leagueId_key" ON "league_members"("playerId", "leagueId");

-- CreateIndex
CREATE INDEX "league_members_leagueId_status_idx" ON "league_members"("leagueId", "status");

-- CreateIndex
CREATE INDEX "league_members_playerId_status_idx" ON "league_members"("playerId", "status");

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;







