-- AlterEnum: Add DOTA_2 to Game enum (only if enum exists, otherwise create it)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Game') THEN
        -- Check if DOTA_2 value already exists before adding
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'DOTA_2' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Game')
        ) THEN
            ALTER TYPE "Game" ADD VALUE 'DOTA_2';
        END IF;
    ELSE
        -- Create Game enum if it doesn't exist (shouldn't happen but safety check)
        CREATE TYPE "Game" AS ENUM ('ROCKET_LEAGUE', 'DOTA_2');
    END IF;
END $$;

-- CreateEnum: LeagueStatus
CREATE TYPE "LeagueStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "LeagueStatus" NOT NULL DEFAULT 'ACTIVE',
    "game" "Game",
    "createdBy" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leagues_guildId_idx" ON "leagues"("guildId");

-- CreateIndex
CREATE INDEX "leagues_status_idx" ON "leagues"("status");

-- CreateIndex
CREATE INDEX "leagues_game_idx" ON "leagues"("game");

-- CreateIndex
CREATE INDEX "leagues_guildId_game_idx" ON "leagues"("guildId", "game");

-- CreateIndex
CREATE INDEX "leagues_guildId_status_idx" ON "leagues"("guildId", "status");

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

