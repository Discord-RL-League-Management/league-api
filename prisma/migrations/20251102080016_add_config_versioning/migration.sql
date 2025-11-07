-- Add configuration versioning columns to guild_settings
-- This enables schema versioning and migration tracking

-- Add schemaVersion column with default value of 1
ALTER TABLE "guild_settings" 
ADD COLUMN IF NOT EXISTS "schemaVersion" INTEGER NOT NULL DEFAULT 1;

-- Add configVersion column for semantic versioning
ALTER TABLE "guild_settings" 
ADD COLUMN IF NOT EXISTS "configVersion" VARCHAR(20);

-- Set default configVersion for existing records
UPDATE "guild_settings" 
SET "configVersion" = '1.0.0' 
WHERE "configVersion" IS NULL;










