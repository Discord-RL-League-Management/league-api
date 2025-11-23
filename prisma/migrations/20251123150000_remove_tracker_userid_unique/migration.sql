-- Remove unique constraint on Tracker.userId to allow multiple trackers per user
-- Drop unique index on userId
DROP INDEX IF EXISTS "trackers_userId_key";

