-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "leagueMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_primaryTrackerId_fkey" FOREIGN KEY ("primaryTrackerId") REFERENCES "trackers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_leagueMemberId_fkey" FOREIGN KEY ("leagueMemberId") REFERENCES "league_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop trigger and function that reference the old guild_settings table
-- The guild_settings table was dropped in migration 20251105225943_refactor_to_generic_infrastructure
-- but the trigger and function were not cleaned up, causing errors when inserting guilds
DROP TRIGGER IF EXISTS guild_settings_auto_create ON guilds;
DROP FUNCTION IF EXISTS ensure_guild_settings();
