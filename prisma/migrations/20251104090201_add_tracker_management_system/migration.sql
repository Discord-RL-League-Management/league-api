-- CreateEnum
CREATE TYPE "TrackerPlatform" AS ENUM ('TRACKER_GG', 'TRN');

-- CreateEnum
CREATE TYPE "TrackerRegistrationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');

-- AlterTable: Add isBanned and isDeleted to users table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'isBanned') THEN
        ALTER TABLE "users" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'isDeleted') THEN
        ALTER TABLE "users" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- CreateIndex: Add indexes for isBanned and isDeleted on users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_isBanned_idx') THEN
        CREATE INDEX "users_isBanned_idx" ON "users"("isBanned");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'users_isDeleted_idx') THEN
        CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");
    END IF;
END $$;

-- AlterTable: Add isBanned and isDeleted to guild_members table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'guild_members' AND column_name = 'isBanned') THEN
        ALTER TABLE "guild_members" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'guild_members' AND column_name = 'isDeleted') THEN
        ALTER TABLE "guild_members" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- CreateIndex: Add indexes for isBanned and isDeleted on guild_members table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'guild_members' AND indexname = 'guild_members_isBanned_idx') THEN
        CREATE INDEX "guild_members_isBanned_idx" ON "guild_members"("isBanned");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'guild_members' AND indexname = 'guild_members_isDeleted_idx') THEN
        CREATE INDEX "guild_members_isDeleted_idx" ON "guild_members"("isDeleted");
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "trackers" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" "TrackerPlatform" NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trackers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "trackers_url_key" ON "trackers"("url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trackers_userId_idx" ON "trackers"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trackers_platform_idx" ON "trackers"("platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trackers_isActive_idx" ON "trackers"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trackers_isDeleted_idx" ON "trackers"("isDeleted");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trackers_userId_fkey'
    ) THEN
        ALTER TABLE "trackers" ADD CONSTRAINT "trackers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tracker_snapshots" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seasonNumber" INTEGER,
    "enteredBy" VARCHAR(20) NOT NULL,
    "ones" INTEGER,
    "twos" INTEGER,
    "threes" INTEGER,
    "fours" INTEGER,
    "onesGamesPlayed" INTEGER,
    "twosGamesPlayed" INTEGER,
    "threesGamesPlayed" INTEGER,
    "foursGamesPlayed" INTEGER,

    CONSTRAINT "tracker_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshots_trackerId_idx" ON "tracker_snapshots"("trackerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshots_seasonNumber_idx" ON "tracker_snapshots"("seasonNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshots_capturedAt_idx" ON "tracker_snapshots"("capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshots_trackerId_capturedAt_idx" ON "tracker_snapshots"("trackerId", "capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshots_trackerId_seasonNumber_idx" ON "tracker_snapshots"("trackerId", "seasonNumber");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_snapshots_trackerId_fkey'
    ) THEN
        ALTER TABLE "tracker_snapshots" ADD CONSTRAINT "tracker_snapshots_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "trackers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_snapshots_enteredBy_fkey'
    ) THEN
        ALTER TABLE "tracker_snapshots" ADD CONSTRAINT "tracker_snapshots_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tracker_snapshot_guilds" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,

    CONSTRAINT "tracker_snapshot_guilds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tracker_snapshot_guilds_snapshotId_guildId_key" ON "tracker_snapshot_guilds"("snapshotId", "guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshot_guilds_guildId_idx" ON "tracker_snapshot_guilds"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_snapshot_guilds_snapshotId_idx" ON "tracker_snapshot_guilds"("snapshotId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_snapshot_guilds_snapshotId_fkey'
    ) THEN
        ALTER TABLE "tracker_snapshot_guilds" ADD CONSTRAINT "tracker_snapshot_guilds_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "tracker_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_snapshot_guilds_guildId_fkey'
    ) THEN
        ALTER TABLE "tracker_snapshot_guilds" ADD CONSTRAINT "tracker_snapshot_guilds_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tracker_registrations" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(20) NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "url" TEXT NOT NULL,
    "platform" "TrackerPlatform",
    "status" "TrackerRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "processedBy" VARCHAR(20),
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "trackerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracker_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tracker_registrations_jobId_key" ON "tracker_registrations"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tracker_registrations_trackerId_key" ON "tracker_registrations"("trackerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_registrations_guildId_idx" ON "tracker_registrations"("guildId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_registrations_status_idx" ON "tracker_registrations"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_registrations_guildId_status_idx" ON "tracker_registrations"("guildId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_registrations_jobId_idx" ON "tracker_registrations"("jobId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_registrations_userId_fkey'
    ) THEN
        ALTER TABLE "tracker_registrations" ADD CONSTRAINT "tracker_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_registrations_guildId_fkey'
    ) THEN
        ALTER TABLE "tracker_registrations" ADD CONSTRAINT "tracker_registrations_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_registrations_processedBy_fkey'
    ) THEN
        ALTER TABLE "tracker_registrations" ADD CONSTRAINT "tracker_registrations_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tracker_registrations_trackerId_fkey'
    ) THEN
        ALTER TABLE "tracker_registrations" ADD CONSTRAINT "tracker_registrations_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "trackers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;






