-- AlterTable
ALTER TABLE `project` ADD COLUMN `chatModeEndedAt` DATETIME(3) NULL,
    ADD COLUMN `chatModeStartedAt` DATETIME(3) NULL;
