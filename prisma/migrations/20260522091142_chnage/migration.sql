/*
  Warnings:

  - You are about to drop the `formprompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multianalysisprompt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `formprompt` DROP FOREIGN KEY `FormPrompt_formId_fkey`;

-- DropForeignKey
ALTER TABLE `multianalysisprompt` DROP FOREIGN KEY `MultiAnalysisPrompt_multiAnalysisFormId_fkey`;

-- AlterTable
ALTER TABLE `project` ADD COLUMN `promptVersionId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `formprompt`;

-- DropTable
DROP TABLE `multianalysisprompt`;

-- CreateTable
CREATE TABLE `PromptDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `ownerType` ENUM('ANALYSIS_FORM', 'MULTI_ANALYSIS_FORM') NOT NULL,
    `analysisFormId` VARCHAR(191) NULL,
    `multiAnalysisFormId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromptDefinition_analysisFormId_key`(`analysisFormId`),
    UNIQUE INDEX `PromptDefinition_multiAnalysisFormId_key`(`multiAnalysisFormId`),
    INDEX `PromptDefinition_ownerType_idx`(`ownerType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptSegmentDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `promptDefinitionId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PromptSegmentDefinition_promptDefinitionId_idx`(`promptDefinitionId`),
    UNIQUE INDEX `PromptSegmentDefinition_promptDefinitionId_key_key`(`promptDefinitionId`, `key`),
    UNIQUE INDEX `PromptSegmentDefinition_promptDefinitionId_sortOrder_key`(`promptDefinitionId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptVersion` (
    `id` VARCHAR(191) NOT NULL,
    `promptDefinitionId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `versionKey` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `publishedAt` DATETIME(3) NULL,

    INDEX `PromptVersion_promptDefinitionId_idx`(`promptDefinitionId`),
    INDEX `PromptVersion_status_idx`(`status`),
    UNIQUE INDEX `PromptVersion_promptDefinitionId_versionNumber_key`(`promptDefinitionId`, `versionNumber`),
    UNIQUE INDEX `PromptVersion_promptDefinitionId_versionKey_key`(`promptDefinitionId`, `versionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptVersionSegmentValue` (
    `id` VARCHAR(191) NOT NULL,
    `promptVersionId` VARCHAR(191) NOT NULL,
    `segmentDefinitionId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PromptVersionSegmentValue_promptVersionId_idx`(`promptVersionId`),
    INDEX `PromptVersionSegmentValue_segmentDefinitionId_idx`(`segmentDefinitionId`),
    UNIQUE INDEX `PromptVersionSegmentValue_promptVersionId_segmentDefinitionI_key`(`promptVersionId`, `segmentDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Project_promptVersionId_idx` ON `Project`(`promptVersionId`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_promptVersionId_fkey` FOREIGN KEY (`promptVersionId`) REFERENCES `PromptVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptDefinition` ADD CONSTRAINT `PromptDefinition_analysisFormId_fkey` FOREIGN KEY (`analysisFormId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptDefinition` ADD CONSTRAINT `PromptDefinition_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptSegmentDefinition` ADD CONSTRAINT `PromptSegmentDefinition_promptDefinitionId_fkey` FOREIGN KEY (`promptDefinitionId`) REFERENCES `PromptDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersion` ADD CONSTRAINT `PromptVersion_promptDefinitionId_fkey` FOREIGN KEY (`promptDefinitionId`) REFERENCES `PromptDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersionSegmentValue` ADD CONSTRAINT `PromptVersionSegmentValue_promptVersionId_fkey` FOREIGN KEY (`promptVersionId`) REFERENCES `PromptVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersionSegmentValue` ADD CONSTRAINT `PromptVersionSegmentValue_segmentDefinitionId_fkey` FOREIGN KEY (`segmentDefinitionId`) REFERENCES `PromptSegmentDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
