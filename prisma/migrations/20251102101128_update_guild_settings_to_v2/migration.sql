-- Update guild settings trigger to schema version 2
-- Single Responsibility: Database trigger for new simplified schema
-- The actual data migration happens in the ConfigMigrationService when settings are accessed

-- Update trigger function to create v2 schema defaults
CREATE OR REPLACE FUNCTION ensure_guild_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create default settings with schema version 2
  INSERT INTO guild_settings ("id", "guildId", "settings", "schemaVersion", "configVersion", "createdAt", "updatedAt")
  SELECT 
    gen_random_uuid()::text,
    NEW.id,
    '{"_metadata":{"version":"1.0.0","schemaVersion":2},"bot_command_channels":[]}'::jsonb,
    2,
    '1.0.0',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM guild_settings WHERE "guildId" = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;










