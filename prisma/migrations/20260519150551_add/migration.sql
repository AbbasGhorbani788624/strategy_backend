/*
  Warnings:

  - The values [STEP] on the enum `Project_mode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `project` ADD COLUMN `multiAnalysisFormId` VARCHAR(191) NULL,
    MODIFY `mode` ENUM('SINGLE', 'MULTI') NOT NULL DEFAULT 'SINGLE';

-- CreateTable
CREATE TABLE `MultiAnalysisRequiredForm` (
    `id` VARCHAR(191) NOT NULL,
    `multiAnalysisFormId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MultiAnalysisRequiredForm_multiAnalysisFormId_order_idx`(`multiAnalysisFormId`, `order`),
    INDEX `MultiAnalysisRequiredForm_formId_idx`(`formId`),
    UNIQUE INDEX `MultiAnalysisRequiredForm_multiAnalysisFormId_formId_key`(`multiAnalysisFormId`, `formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisPrompt` (
    `id` VARCHAR(191) NOT NULL,
    `multiAnalysisFormId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MultiAnalysisPrompt_multiAnalysisFormId_idx`(`multiAnalysisFormId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisProjectSource` (
    `id` VARCHAR(191) NOT NULL,
    `multiProjectId` VARCHAR(191) NOT NULL,
    `sourceProjectId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MultiAnalysisProjectSource_multiProjectId_idx`(`multiProjectId`),
    INDEX `MultiAnalysisProjectSource_sourceProjectId_idx`(`sourceProjectId`),
    INDEX `MultiAnalysisProjectSource_formId_idx`(`formId`),
    UNIQUE INDEX `MultiAnalysisProjectSource_multiProjectId_formId_key`(`multiProjectId`, `formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisForm` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MultiAnalysisForm_isActive_idx`(`isActive`),
    INDEX `MultiAnalysisForm_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisGoal` (
    `id` VARCHAR(191) NOT NULL,
    `multiAnalysisFormId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MultiAnalysisGoal_multiAnalysisFormId_idx`(`multiAnalysisFormId`),
    UNIQUE INDEX `MultiAnalysisGoal_multiAnalysisFormId_title_key`(`multiAnalysisFormId`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectMultiGoal` (
    `projectId` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectMultiGoal_goalId_idx`(`goalId`),
    PRIMARY KEY (`projectId`, `goalId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AnalysisForm_isActive_idx` ON `AnalysisForm`(`isActive`);

-- CreateIndex
CREATE INDEX `AnalysisForm_order_idx` ON `AnalysisForm`(`order`);

-- CreateIndex
CREATE INDEX `Project_formId_idx` ON `Project`(`formId`);

-- CreateIndex
CREATE INDEX `Project_multiAnalysisFormId_idx` ON `Project`(`multiAnalysisFormId`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisRequiredForm` ADD CONSTRAINT `MultiAnalysisRequiredForm_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisRequiredForm` ADD CONSTRAINT `MultiAnalysisRequiredForm_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisPrompt` ADD CONSTRAINT `MultiAnalysisPrompt_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_multiProjectId_fkey` FOREIGN KEY (`multiProjectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_sourceProjectId_fkey` FOREIGN KEY (`sourceProjectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisGoal` ADD CONSTRAINT `MultiAnalysisGoal_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMultiGoal` ADD CONSTRAINT `ProjectMultiGoal_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMultiGoal` ADD CONSTRAINT `ProjectMultiGoal_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `MultiAnalysisGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
