/*
  Warnings:

  - You are about to drop the column `primaryTrackerId` on the `players` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."players" DROP CONSTRAINT "players_primaryTrackerId_fkey";

-- AlterTable
ALTER TABLE "players" DROP COLUMN "primaryTrackerId";
