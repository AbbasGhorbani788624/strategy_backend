-- AlterTable
ALTER TABLE `MultiAnalysisRequiredForm`
    ADD COLUMN `type` ENUM('SINGLE', 'MULTI') NOT NULL DEFAULT 'SINGLE',
    ADD COLUMN `requiredMultiAnalysisFormId` VARCHAR(191) NULL,
    MODIFY `formId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `MARForm_parent_requiredMulti_uq` ON `MultiAnalysisRequiredForm`(`multiAnalysisFormId`, `requiredMultiAnalysisFormId`);
CREATE INDEX `MARForm_requiredMultiAnalysisFormId_idx` ON `MultiAnalysisRequiredForm`(`requiredMultiAnalysisFormId`);

-- AddForeignKey
ALTER TABLE `MultiAnalysisRequiredForm` ADD CONSTRAINT `MARForm_requiredMultiAnalysisFormId_fkey` FOREIGN KEY (`requiredMultiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `MultiAnalysisProjectSource`
    MODIFY `formId` VARCHAR(191) NULL,
    ADD COLUMN `multiAnalysisFormId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `MAPSource_multiProject_multiAnalysis_uq` ON `MultiAnalysisProjectSource`(`multiProjectId`, `multiAnalysisFormId`);
CREATE INDEX `MAPSource_multiAnalysisFormId_idx` ON `MultiAnalysisProjectSource`(`multiAnalysisFormId`);

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MAPSource_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
