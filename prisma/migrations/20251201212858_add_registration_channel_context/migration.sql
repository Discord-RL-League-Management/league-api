-- Add registration channel context fields to Tracker model
-- These fields store the Discord channel and interaction token where the tracker was registered
-- Used for sending ephemeral follow-up messages instead of DMs

ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "registrationChannelId" TEXT;
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "registrationInteractionToken" TEXT;



