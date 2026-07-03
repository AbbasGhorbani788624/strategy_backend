/*
  Warnings:

  - You are about to drop the column `formId` on the `formcategorygroup` table. All the data in the column will be lost.
  - You are about to drop the column `formId` on the `formquestion` table. All the data in the column will be lost.
  - You are about to drop the column `formId` on the `formquestioncategory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `formcategorygroup` DROP FOREIGN KEY `FormCategoryGroup_formId_fkey`;

-- DropForeignKey
ALTER TABLE `formquestion` DROP FOREIGN KEY `FormQuestion_formId_fkey`;

-- DropForeignKey
ALTER TABLE `formquestioncategory` DROP FOREIGN KEY `FormQuestionCategory_formId_fkey`;

-- DropIndex
DROP INDEX `FormCategoryGroup_formId_fkey` ON `formcategorygroup`;

-- DropIndex
DROP INDEX `FormQuestion_formId_fkey` ON `formquestion`;

-- DropIndex
DROP INDEX `FormQuestionCategory_formId_idx` ON `formquestioncategory`;

-- DropIndex
DROP INDEX `FormQuestionCategory_order_idx` ON `formquestioncategory`;

-- AlterTable
ALTER TABLE `formcategorygroup` DROP COLUMN `formId`,
    ADD COLUMN `analysisFormId` VARCHAR(191) NULL,
    ADD COLUMN `multiAnalysisFormId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `formquestion` DROP COLUMN `formId`;

-- AlterTable
ALTER TABLE `formquestioncategory` DROP COLUMN `formId`,
    ADD COLUMN `analysisFormId` VARCHAR(191) NULL,
    ADD COLUMN `multiAnalysisFormId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `FormCategoryGroup_analysisFormId_idx` ON `FormCategoryGroup`(`analysisFormId`);

-- CreateIndex
CREATE INDEX `FormCategoryGroup_multiAnalysisFormId_idx` ON `FormCategoryGroup`(`multiAnalysisFormId`);

-- CreateIndex
CREATE INDEX `FormQuestionCategory_analysisFormId_idx` ON `FormQuestionCategory`(`analysisFormId`);

-- CreateIndex
CREATE INDEX `FormQuestionCategory_multiAnalysisFormId_idx` ON `FormQuestionCategory`(`multiAnalysisFormId`);

-- AddForeignKey
ALTER TABLE `FormQuestionCategory` ADD CONSTRAINT `FormQuestionCategory_analysisFormId_fkey` FOREIGN KEY (`analysisFormId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormQuestionCategory` ADD CONSTRAINT `FormQuestionCategory_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCategoryGroup` ADD CONSTRAINT `FormCategoryGroup_analysisFormId_fkey` FOREIGN KEY (`analysisFormId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCategoryGroup` ADD CONSTRAINT `FormCategoryGroup_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
