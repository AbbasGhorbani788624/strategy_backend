/*
  Warnings:

  - You are about to drop the column `categoryId` on the `analysisform` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `AnalysisForm_categoryId_idx` ON `analysisform`;

-- AlterTable
ALTER TABLE `analysisform` DROP COLUMN `categoryId`;
