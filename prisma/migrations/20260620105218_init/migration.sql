/*
  Warnings:

  - The values [ADMIN_FEEDBACK,PROJECT_RATED] on the enum `Notification_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `analysisform` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('PROJECT_ACCESS_GRANTED', 'FOLLOW_UP_ANSWERED') NOT NULL;

-- CreateTable
CREATE TABLE `AnalysisCategory` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AnalysisForm_categoryId_idx` ON `AnalysisForm`(`categoryId`);

-- AddForeignKey
ALTER TABLE `AnalysisForm` ADD CONSTRAINT `AnalysisForm_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `AnalysisCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
