/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guild_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `processed_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tracker_outbox` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tracker_snapshot_guilds` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_guildId_fkey";

-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."guild_settings" DROP CONSTRAINT "guild_settings_guildId_fkey";

-- DropForeignKey
ALTER TABLE "public"."settings_history" DROP CONSTRAINT "settings_history_guildId_fkey";

-- DropForeignKey
ALTER TABLE "public"."settings_history" DROP CONSTRAINT "settings_history_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tracker_outbox" DROP CONSTRAINT "tracker_outbox_registrationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tracker_snapshot_guilds" DROP CONSTRAINT "tracker_snapshot_guilds_guildId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tracker_snapshot_guilds" DROP CONSTRAINT "tracker_snapshot_guilds_snapshotId_fkey";

-- DropTable
DROP TABLE "public"."audit_logs";

-- DropTable
DROP TABLE "public"."guild_settings";

-- DropTable
DROP TABLE "public"."processed_messages";

-- DropTable
DROP TABLE "public"."settings_history";

-- DropTable
DROP TABLE "public"."tracker_outbox";

-- DropTable
DROP TABLE "public"."tracker_snapshot_guilds";

-- DropEnum
DROP TYPE "public"."TrackerOutboxStatus";

-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "sourceType" VARCHAR(50) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "entityType" VARCHAR(50),
    "entityId" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "userId" VARCHAR(20),
    "guildId" VARCHAR(20),
    "changes" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "ownerType" VARCHAR(50) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "configVersion" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_visibility" (
    "id" TEXT NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" TEXT NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_status_createdAt_idx" ON "outbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_sourceType_sourceId_idx" ON "outbox"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "outbox_sourceType_status_idx" ON "outbox"("sourceType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "processed_events_eventKey_key" ON "processed_events"("eventKey");

-- CreateIndex
CREATE INDEX "processed_events_entityType_entityId_idx" ON "processed_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "processed_events_processedAt_idx" ON "processed_events"("processedAt");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_timestamp_idx" ON "activity_logs"("entityType", "entityId", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_userId_timestamp_idx" ON "activity_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_guildId_timestamp_idx" ON "activity_logs"("guildId", "timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_eventType_timestamp_idx" ON "activity_logs"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "settings_ownerType_ownerId_idx" ON "settings"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_ownerType_ownerId_key" ON "settings"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "entity_visibility_entityType_entityId_idx" ON "entity_visibility"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "entity_visibility_targetType_targetId_idx" ON "entity_visibility"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_visibility_entityType_entityId_targetType_targetId_key" ON "entity_visibility"("entityType", "entityId", "targetType", "targetId");
