-- Migration: Make Player related to GuildMember instead of User
-- This migration adds guildMemberId to players table, populates it from existing data,
-- and updates constraints accordingly.

-- Step 1: Add guildMemberId column (nullable initially)
ALTER TABLE "players" ADD COLUMN "guildMemberId" TEXT;

-- Step 2: Populate guildMemberId for all existing Players by finding the corresponding GuildMember
-- using (userId, guildId)
UPDATE "players" p
SET "guildMemberId" = gm.id
FROM "guild_members" gm
WHERE p."userId" = gm."userId" 
  AND p."guildId" = gm."guildId";

-- Step 3: Verify that all Players have matching GuildMembers
-- If any Players don't have matching GuildMembers, this will fail
-- (This is a safety check - in production, all Players should have GuildMembers)
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM "players"
  WHERE "guildMemberId" IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % Players without matching GuildMembers. Cannot proceed with migration.', orphaned_count;
  END IF;
END $$;

-- Step 4: Make guildMemberId NOT NULL
ALTER TABLE "players" ALTER COLUMN "guildMemberId" SET NOT NULL;

-- Step 5: Remove foreign key constraint on userId (keeps column as regular field)
ALTER TABLE "players" DROP CONSTRAINT IF EXISTS "players_userId_fkey";

-- Step 6: Drop old unique constraint on (userId, guildId)
DROP INDEX IF EXISTS "players_userId_guildId_key";

-- Step 7: Add foreign key constraint on guildMemberId → guild_members(id) with CASCADE delete
ALTER TABLE "players" ADD CONSTRAINT "players_guildMemberId_fkey" 
  FOREIGN KEY ("guildMemberId") REFERENCES "guild_members"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Add new unique constraint on (userId, guildMemberId)
CREATE UNIQUE INDEX "players_userId_guildMemberId_key" ON "players"("userId", "guildMemberId");
