-- CreateEnum: MatchStatus
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FORFEIT');

-- CreateEnum: MatchParticipantType
CREATE TYPE "MatchParticipantType" AS ENUM ('TEAM_MEMBER', 'SUBSTITUTE', 'GUEST');

-- CreateTable: Match
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT,
    "leagueId" TEXT NOT NULL,
    "round" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "playedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MatchParticipant
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "participantType" "MatchParticipantType" NOT NULL DEFAULT 'TEAM_MEMBER',
    "teamMemberId" TEXT,
    "isWinner" BOOLEAN NOT NULL,
    "score" INTEGER,
    "goals" INTEGER,
    "assists" INTEGER,
    "saves" INTEGER,
    "shots" INTEGER,
    "wasSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "substituteReason" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matches_tournamentId_idx" ON "matches"("tournamentId");

-- CreateIndex
CREATE INDEX "matches_leagueId_idx" ON "matches"("leagueId");

-- CreateIndex
CREATE INDEX "match_participants_playerId_matchId_idx" ON "match_participants"("playerId", "matchId");

-- CreateIndex
CREATE INDEX "match_participants_teamId_matchId_idx" ON "match_participants"("teamId", "matchId");

-- CreateIndex
CREATE INDEX "match_participants_playerId_wasSubstitute_idx" ON "match_participants"("playerId", "wasSubstitute");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;







