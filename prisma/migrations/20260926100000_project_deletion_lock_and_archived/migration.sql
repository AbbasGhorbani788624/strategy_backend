-- AlterTable
ALTER TABLE `Project` MODIFY `status` ENUM('WAITING_FOR_FORM', 'ANALYSIS_PENDING', 'AI_PROCESSING', 'REVIEWING', 'CHAT_MODE', 'FINAL_ANALYSIS', 'FAILED', 'ARCHIVED') NOT NULL DEFAULT 'WAITING_FOR_FORM';

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `deletionLockedAt` DATETIME(3) NULL,
    ADD COLUMN `deletionLockedById` VARCHAR(191) NULL,
    ADD COLUMN `deletionLockReason` TEXT NULL;

-- CreateIndex
CREATE INDEX `Project_deletionLockedById_idx` ON `Project`(`deletionLockedById`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_deletionLockedById_fkey` FOREIGN KEY (`deletionLockedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
