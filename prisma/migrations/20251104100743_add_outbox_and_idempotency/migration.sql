-- CreateEnum: TrackerOutboxStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrackerOutboxStatus') THEN
        CREATE TYPE "TrackerOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

-- AlterTable: Add new fields to tracker_registrations
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tracker_registrations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracker_registrations' AND column_name = 'notificationSentAt') THEN
            ALTER TABLE "tracker_registrations" ADD COLUMN "notificationSentAt" TIMESTAMP(3);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracker_registrations' AND column_name = 'notificationAttempts') THEN
            ALTER TABLE "tracker_registrations" ADD COLUMN "notificationAttempts" INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracker_registrations' AND column_name = 'lastProcessedAt') THEN
            ALTER TABLE "tracker_registrations" ADD COLUMN "lastProcessedAt" TIMESTAMP(3);
        END IF;
    END IF;
END $$;

-- CreateTable: tracker_outbox
CREATE TABLE IF NOT EXISTS "tracker_outbox" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "TrackerOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracker_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tracker_outbox_status_createdAt_idx" ON "tracker_outbox"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "tracker_outbox_registrationId_idx" ON "tracker_outbox"("registrationId");
CREATE INDEX IF NOT EXISTS "tracker_outbox_status_idx" ON "tracker_outbox"("status");

-- AddForeignKey
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tracker_outbox') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'tracker_outbox_registrationId_fkey'
        ) THEN
            ALTER TABLE "tracker_outbox" ADD CONSTRAINT "tracker_outbox_registrationId_fkey" 
            FOREIGN KEY ("registrationId") REFERENCES "tracker_registrations"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- CreateTable: processed_messages
CREATE TABLE IF NOT EXISTS "processed_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "registrationId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "processed_messages_messageId_key" ON "processed_messages"("messageId");
CREATE INDEX IF NOT EXISTS "processed_messages_registrationId_idx" ON "processed_messages"("registrationId");





