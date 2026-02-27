/*
  Warnings:

  - Added the required column `flowId` to the `StepSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `stepsession` ADD COLUMN `flowId` VARCHAR(191) NOT NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `StepFlowItem` (
    `id` VARCHAR(191) NOT NULL,
    `flowId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,

    INDEX `StepFlowItem_flowId_order_idx`(`flowId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StepFlow` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `StepSession_flowId_idx` ON `StepSession`(`flowId`);

-- CreateIndex
CREATE INDEX `StepSession_status_idx` ON `StepSession`(`status`);

-- AddForeignKey
ALTER TABLE `StepSession` ADD CONSTRAINT `StepSession_flowId_fkey` FOREIGN KEY (`flowId`) REFERENCES `StepFlow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StepFlowItem` ADD CONSTRAINT `StepFlowItem_flowId_fkey` FOREIGN KEY (`flowId`) REFERENCES `StepFlow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StepFlowItem` ADD CONSTRAINT `StepFlowItem_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
