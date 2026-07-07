-- AlterTable
ALTER TABLE `analysisform` ADD COLUMN `checklistTitle` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `multianalysisform` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `checklistTitle` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `MultiAnalysisForm_categoryId_idx` ON `MultiAnalysisForm`(`categoryId`);

-- AddForeignKey
ALTER TABLE `MultiAnalysisForm` ADD CONSTRAINT `MultiAnalysisForm_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `AnalysisCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
