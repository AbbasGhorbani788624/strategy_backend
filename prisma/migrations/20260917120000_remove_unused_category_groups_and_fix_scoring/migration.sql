-- DropForeignKey
ALTER TABLE `formcategorygroup` DROP FOREIGN KEY `FormCategoryGroup_analysisFormId_fkey`;

-- DropForeignKey
ALTER TABLE `formcategorygroup` DROP FOREIGN KEY `FormCategoryGroup_multiAnalysisFormId_fkey`;

-- DropForeignKey
ALTER TABLE `formcategorygroupitem` DROP FOREIGN KEY `FormCategoryGroupItem_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `formcategorygroupitem` DROP FOREIGN KEY `FormCategoryGroupItem_groupId_fkey`;

-- DropTable
DROP TABLE `formcategorygroup`;

-- DropTable
DROP TABLE `formcategorygroupitem`;
