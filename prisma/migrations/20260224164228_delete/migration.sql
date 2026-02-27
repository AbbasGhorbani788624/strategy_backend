/*
  Warnings:

  - You are about to drop the `formcategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `analysisform` DROP FOREIGN KEY `AnalysisForm_categoryId_fkey`;

-- DropTable
DROP TABLE `formcategory`;
