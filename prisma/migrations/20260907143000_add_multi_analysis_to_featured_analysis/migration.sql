-- AlterTable
ALTER TABLE `FeaturedAnalysis` DROP FOREIGN KEY `FeaturedAnalysis_analysisFormId_fkey`;

ALTER TABLE `FeaturedAnalysis`
    MODIFY `analysisFormId` VARCHAR(191) NULL,
    ADD COLUMN `multiAnalysisFormId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `FeaturedAnalysis_multiAnalysisFormId_key` ON `FeaturedAnalysis`(`multiAnalysisFormId`);

ALTER TABLE `FeaturedAnalysis` ADD CONSTRAINT `FeaturedAnalysis_analysisFormId_fkey` FOREIGN KEY (`analysisFormId`) REFERENCES `AnalysisForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FeaturedAnalysis` ADD CONSTRAINT `FeaturedAnalysis_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
