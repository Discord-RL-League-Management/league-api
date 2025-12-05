/*
  Warnings:

  - The `platform` column on the `tracker_registrations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `username` to the `trackers` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `trackers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum (only if doesn't exist - Game enum may already exist from earlier migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GamePlatform') THEN
        CREATE TYPE "GamePlatform" AS ENUM ('STEAM', 'EPIC', 'XBL', 'PSN', 'SWITCH');
    END IF;
END $$;

-- CreateEnum (only if doesn't exist - Game enum may already exist from 20250127000000_add_league)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Game') THEN
        CREATE TYPE "Game" AS ENUM ('ROCKET_LEAGUE');
    END IF;
END $$;

-- AlterTable
ALTER TABLE "tracker_registrations" ADD COLUMN     "game" "Game" NOT NULL DEFAULT 'ROCKET_LEAGUE',
ADD COLUMN     "username" TEXT,
DROP COLUMN "platform",
ADD COLUMN     "platform" "GamePlatform";

-- AlterTable
ALTER TABLE "trackers" ADD COLUMN     "game" "Game" NOT NULL DEFAULT 'ROCKET_LEAGUE',
ADD COLUMN     "username" TEXT NOT NULL,
DROP COLUMN "platform",
ADD COLUMN     "platform" "GamePlatform" NOT NULL;

-- DropEnum
DROP TYPE "public"."TrackerPlatform";

-- CreateIndex
CREATE INDEX "trackers_platform_idx" ON "trackers"("platform");
