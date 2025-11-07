-- Update ensure_guild_settings() trigger to work with new generic settings table
-- Single Responsibility: Update database trigger after schema refactoring
--
-- This migration updates the trigger function that was created for the old
-- guild_settings table to work with the new generic settings table structure.
-- The refactor migration (20251105225943) changed from guild_settings to settings,
-- but the trigger function was not updated at that time.

-- Update trigger function to insert into settings table instead of guild_settings
CREATE OR REPLACE FUNCTION ensure_guild_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create default settings if they don't exist
  -- Use the new settings table structure with ownerType/ownerId instead of guildId
  INSERT INTO settings ("id", "ownerType", "ownerId", "settings", "schemaVersion", "configVersion", "createdAt", "updatedAt")
  SELECT 
    gen_random_uuid()::text,
    'guild',
    NEW.id,
    '{"_metadata":{"version":"1.0.0","schemaVersion":2},"bot_command_channels":[],"register_command_channels":[],"roles":{"admin":[],"moderator":[],"member":[],"league_manager":[],"tournament_manager":[]}}'::jsonb,
    2,
    '1.0.0',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM settings WHERE "ownerType" = 'guild' AND "ownerId" = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger itself (guild_settings_auto_create) was already created
-- and will continue to work with the updated function. No need to recreate it.

