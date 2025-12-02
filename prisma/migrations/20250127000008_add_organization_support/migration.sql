-- CreateEnum: OrganizationMemberRole
CREATE TYPE "OrganizationMemberRole" AS ENUM ('GENERAL_MANAGER', 'MEMBER');

-- CreateEnum: OrganizationMemberStatus
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateTable: Organization
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "tag" VARCHAR(20),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OrganizationMember
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "approvedBy" VARCHAR(20),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add organizationId to teams
ALTER TABLE "teams" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "organizations_leagueId_idx" ON "organizations"("leagueId");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_status_idx" ON "organization_members"("organizationId", "status");

-- CreateIndex
CREATE INDEX "organization_members_leagueId_status_idx" ON "organization_members"("leagueId", "status");

-- CreateIndex
CREATE INDEX "organization_members_playerId_status_idx" ON "organization_members"("playerId", "status");

-- CreateIndex
CREATE INDEX "teams_organizationId_idx" ON "teams"("organizationId");

-- CreateIndex
CREATE INDEX "teams_leagueId_organizationId_idx" ON "teams"("leagueId", "organizationId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "organization_members_organizationId_playerId_key" ON "organization_members"("organizationId", "playerId");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "organization_members_playerId_leagueId_key" ON "organization_members"("playerId", "leagueId");


