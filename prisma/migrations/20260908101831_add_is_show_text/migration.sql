-- DropForeignKey
ALTER TABLE `multianalysisprojectsource` DROP FOREIGN KEY `MAPSource_multiAnalysisFormId_fkey`;

-- DropForeignKey
ALTER TABLE `multianalysisrequiredform` DROP FOREIGN KEY `MARForm_requiredMultiAnalysisFormId_fkey`;

-- AlterTable
ALTER TABLE `analysisform` ADD COLUMN `isShowText` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `title` VARCHAR(500) NOT NULL;

-- AlterTable
ALTER TABLE `multianalysisform` ADD COLUMN `isShowText` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `title` VARCHAR(500) NOT NULL;

-- AddForeignKey
ALTER TABLE `MultiAnalysisRequiredForm` ADD CONSTRAINT `MultiAnalysisRequiredForm_requiredMultiAnalysisFormId_fkey` FOREIGN KEY (`requiredMultiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
