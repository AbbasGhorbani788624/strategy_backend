/*
  Warnings:

  - You are about to drop the column `allowedViewerIds` on the `project` table. All the data in the column will be lost.
  - The values [ANALYZING,COMPLETED] on the enum `Project_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `project` DROP COLUMN `allowedViewerIds`,
    MODIFY `status` ENUM('DRAFT', 'REVIEWING', 'CHAT_MODE', 'RISK_ANALYSIS', 'FINAL_ANALYSIS') NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE `ProjectAccess` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectAccess_projectId_idx`(`projectId`),
    INDEX `ProjectAccess_userId_idx`(`userId`),
    UNIQUE INDEX `ProjectAccess_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectAccess` ADD CONSTRAINT `ProjectAccess_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectAccess` ADD CONSTRAINT `ProjectAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
