-- CreateTable
CREATE TABLE "guilds" (
    "id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "ownerId" VARCHAR(20) NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_settings" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(20) NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "roles" TEXT[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guilds_isActive_idx" ON "guilds"("isActive");

-- CreateIndex
CREATE INDEX "guilds_joinedAt_idx" ON "guilds"("joinedAt");

-- CreateIndex
CREATE INDEX "guilds_ownerId_idx" ON "guilds"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "guild_settings_guildId_key" ON "guild_settings"("guildId");

-- CreateIndex
CREATE INDEX "guild_members_guildId_idx" ON "guild_members"("guildId");

-- CreateIndex
CREATE INDEX "guild_members_userId_idx" ON "guild_members"("userId");

-- CreateIndex
CREATE INDEX "guild_members_joinedAt_idx" ON "guild_members"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_userId_guildId_key" ON "guild_members"("userId", "guildId");

-- AddForeignKey
ALTER TABLE "guild_settings" ADD CONSTRAINT "guild_settings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
