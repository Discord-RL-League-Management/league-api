-- CreateEnum: PlayerStatus
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(20) NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "primaryTrackerId" TEXT,
    "lastLeftLeagueAt" TIMESTAMP(3),
    "lastLeftLeagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_userId_guildId_key" ON "players"("userId", "guildId");

-- CreateIndex
CREATE INDEX "players_guildId_status_idx" ON "players"("guildId", "status");

-- CreateIndex
CREATE INDEX "players_userId_idx" ON "players"("userId");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_primaryTrackerId_fkey" FOREIGN KEY ("primaryTrackerId") REFERENCES "trackers"("id") ON DELETE SET NULL ON UPDATE CASCADE;




