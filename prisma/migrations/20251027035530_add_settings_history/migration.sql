-- CreateTable
CREATE TABLE "settings_history" (
    "id" TEXT NOT NULL,
    "guildId" VARCHAR(20) NOT NULL,
    "userId" VARCHAR(20) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "changes" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settings_history_guildId_idx" ON "settings_history"("guildId");

-- CreateIndex
CREATE INDEX "settings_history_userId_idx" ON "settings_history"("userId");

-- CreateIndex
CREATE INDEX "settings_history_timestamp_idx" ON "settings_history"("timestamp");

-- AddForeignKey
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
