/*
  Warnings:

  - Added the required column `organizationalLevel` to the `UserInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `userinfo` ADD COLUMN `boardMember` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `organizationalLevel` VARCHAR(191) NOT NULL,
    ADD COLUMN `shareholder` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `strategyTeamMember` BOOLEAN NOT NULL DEFAULT false;
