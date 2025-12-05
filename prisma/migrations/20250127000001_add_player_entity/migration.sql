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

-- AddForeignKey - Deferred: guilds table doesn't exist yet
-- Will be added in migration 20251026014512_add_deferred_foreign_keys
-- after the guilds table is created in 20251026014511_add_guild_management
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guilds') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'players_guildId_fkey'
        ) THEN
            ALTER TABLE "players" ADD CONSTRAINT "players_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AddForeignKey - Deferred: trackers table doesn't exist yet
-- Will be added in migration 20251026014512_add_deferred_foreign_keys
-- after the trackers table is created in 20251104090201_add_tracker_management_system
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trackers') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'players_primaryTrackerId_fkey'
        ) THEN
            ALTER TABLE "players" ADD CONSTRAINT "players_primaryTrackerId_fkey" FOREIGN KEY ("primaryTrackerId") REFERENCES "trackers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;








