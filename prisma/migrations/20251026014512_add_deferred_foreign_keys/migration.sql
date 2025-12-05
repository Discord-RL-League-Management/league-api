-- Add missing foreign keys that were deferred due to table creation order
-- This migration runs after guilds table is created (20251026014511_add_guild_management)
-- to add foreign keys that were removed from earlier migrations

-- AddForeignKey: leagues.guildId -> guilds.id
-- This was removed from 20250127000000_add_league because guilds didn't exist yet
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guilds') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leagues') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'leagues_guildId_fkey'
            ) THEN
                ALTER TABLE "leagues" ADD CONSTRAINT "leagues_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- AddForeignKey: players.guildId -> guilds.id (if not already added)
-- This was made conditional in 20250127000001_add_player_entity, but we ensure it exists here
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guilds') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'players') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'players_guildId_fkey'
            ) THEN
                ALTER TABLE "players" ADD CONSTRAINT "players_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- Note: players.primaryTrackerId -> trackers.id foreign key is handled conditionally
-- in 20250127000001_add_player_entity migration and will be added automatically
-- when the trackers table is created in 20251104090201_add_tracker_management_system

