-- Auto-create guild settings trigger
-- This ensures that every guild has settings automatically created when the guild is inserted
-- Single Responsibility: Database-level enforcement of settings existence

-- Create trigger function that auto-creates default settings for new guilds
CREATE OR REPLACE FUNCTION ensure_guild_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create default settings if they don't exist
  INSERT INTO guild_settings ("id", "guildId", "settings", "createdAt", "updatedAt")
  SELECT 
    gen_random_uuid()::text,
    NEW.id,
    '{"channels":{"general":null,"announcements":null,"league_chat":null,"tournament_chat":null,"logs":null},"roles":{"admin":[],"moderator":[],"member":[],"league_manager":[],"tournament_manager":[]},"features":{"league_management":true,"tournament_mode":false,"auto_roles":false,"statistics":true,"leaderboards":true},"permissions":{"create_leagues":["admin"],"manage_teams":["admin"],"view_stats":["member"],"manage_tournaments":["admin"],"manage_roles":["admin"],"view_logs":["admin","moderator"]},"display":{"show_leaderboards":true,"show_member_count":false,"theme":"default","command_prefix":"!"}}'::jsonb,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM guild_settings WHERE "guildId" = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that executes after guild insert
CREATE TRIGGER guild_settings_auto_create
  AFTER INSERT ON guilds
  FOR EACH ROW
  EXECUTE FUNCTION ensure_guild_settings();

