-- CreateEnum
CREATE TYPE "ScheduledProcessingStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "scheduled_tracker_processing" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" VARCHAR(20) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_tracker_processing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_tracker_processing_guildId_idx" ON "scheduled_tracker_processing"("guildId");

-- CreateIndex
CREATE INDEX "scheduled_tracker_processing_status_idx" ON "scheduled_tracker_processing"("status");

-- CreateIndex
CREATE INDEX "scheduled_tracker_processing_scheduledAt_idx" ON "scheduled_tracker_processing"("scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_tracker_processing_guildId_scheduledAt_idx" ON "scheduled_tracker_processing"("guildId", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_tracker_processing_status_scheduledAt_idx" ON "scheduled_tracker_processing"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "scheduled_tracker_processing" ADD CONSTRAINT "scheduled_tracker_processing_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
