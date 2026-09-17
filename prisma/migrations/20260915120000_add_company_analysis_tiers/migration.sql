-- AlterTable
ALTER TABLE `Company` ADD COLUMN `monitoringUnlockedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `CompanyAnalysisTierConfig` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `tier` ENUM('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4') NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyAnalysisTierConfig_companyId_idx`(`companyId`),
    UNIQUE INDEX `CompanyAnalysisTierConfig_companyId_tier_key`(`companyId`, `tier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyAnalysisTierItem` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `analysisFormId` VARCHAR(191) NULL,
    `multiAnalysisFormId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyAnalysisTierItem_configId_sortOrder_idx`(`configId`, `sortOrder`),
    INDEX `CompanyAnalysisTierItem_companyId_idx`(`companyId`),
    UNIQUE INDEX `CompanyAnalysisTierItem_companyId_analysisFormId_key`(`companyId`, `analysisFormId`),
    UNIQUE INDEX `CompanyAnalysisTierItem_companyId_multiAnalysisFormId_key`(`companyId`, `multiAnalysisFormId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompanyAnalysisTierConfig` ADD CONSTRAINT `CompanyAnalysisTierConfig_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAnalysisTierItem` ADD CONSTRAINT `CompanyAnalysisTierItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAnalysisTierItem` ADD CONSTRAINT `CompanyAnalysisTierItem_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `CompanyAnalysisTierConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAnalysisTierItem` ADD CONSTRAINT `CompanyAnalysisTierItem_analysisFormId_fkey` FOREIGN KEY (`analysisFormId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAnalysisTierItem` ADD CONSTRAINT `CompanyAnalysisTierItem_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: unlock monitoring for companies that already have strategy plans
UPDATE `Company` c
SET c.`monitoringUnlockedAt` = NOW(3)
WHERE c.`monitoringUnlockedAt` IS NULL
  AND EXISTS (
    SELECT 1 FROM `StrategyPlan` sp WHERE sp.`companyId` = c.`id`
  );
