/*
  Warnings:

  - You are about to drop the column `boardMember` on the `userinfo` table. All the data in the column will be lost.
  - You are about to drop the column `shareholder` on the `userinfo` table. All the data in the column will be lost.
  - You are about to drop the column `strategyTeamMember` on the `userinfo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `userinfo` DROP COLUMN `boardMember`,
    DROP COLUMN `shareholder`,
    DROP COLUMN `strategyTeamMember`,
    ADD COLUMN `isboardMember` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isshareholder` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isstrategyTeamMember` BOOLEAN NOT NULL DEFAULT false;
