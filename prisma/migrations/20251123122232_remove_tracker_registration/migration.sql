-- DropForeignKey
ALTER TABLE "public"."tracker_registrations" DROP CONSTRAINT IF EXISTS "tracker_registrations_guildId_fkey";
ALTER TABLE "public"."tracker_registrations" DROP CONSTRAINT IF EXISTS "tracker_registrations_processedBy_fkey";
ALTER TABLE "public"."tracker_registrations" DROP CONSTRAINT IF EXISTS "tracker_registrations_trackerId_fkey";
ALTER TABLE "public"."tracker_registrations" DROP CONSTRAINT IF EXISTS "tracker_registrations_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "public"."tracker_registrations_guildId_idx";
DROP INDEX IF EXISTS "public"."tracker_registrations_guildId_status_idx";
DROP INDEX IF EXISTS "public"."tracker_registrations_jobId_idx";
DROP INDEX IF EXISTS "public"."tracker_registrations_status_idx";
DROP INDEX IF EXISTS "public"."tracker_registrations_jobId_key";
DROP INDEX IF EXISTS "public"."tracker_registrations_trackerId_key";

-- DropTable
DROP TABLE IF EXISTS "public"."tracker_registrations";

-- DropEnum
DROP TYPE IF EXISTS "public"."TrackerRegistrationStatus";

