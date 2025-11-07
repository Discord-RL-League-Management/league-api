-- Update ensure_guild_settings() trigger to set schema version for new guilds
-- Single Responsibility: Database-level defaults with version tracking

-- Update trigger function to include schema version columns
CREATE OR REPLACE FUNCTION ensure_guild_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create default settings if they don't exist
  INSERT INTO guild_settings ("id", "guildId", "settings", "schemaVersion", "configVersion", "createdAt", "updatedAt")
  SELECT 
    gen_random_uuid()::text,
    NEW.id,
    '{"_metadata":{"version":"1.0.0","schemaVersion":1},"channels":{"general":null,"announcements":null,"league_chat":null,"tournament_chat":null,"logs":null},"roles":{"admin":[],"moderator":[],"member":[],"league_manager":[],"tournament_manager":[]},"features":{"league_management":true,"tournament_mode":false,"auto_roles":false,"statistics":true,"leaderboards":true},"permissions":{"create_leagues":["admin"],"manage_teams":["admin"],"view_stats":["member"],"manage_tournaments":["admin"],"manage_roles":["admin"],"view_logs":["admin","moderator"]},"display":{"show_leaderboards":true,"show_member_count":false,"theme":"default","command_prefix":"!"}}'::jsonb,
    1,
    '1.0.0',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM guild_settings WHERE "guildId" = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;










