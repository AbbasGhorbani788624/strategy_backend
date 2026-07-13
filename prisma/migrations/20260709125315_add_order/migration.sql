-- AlterTable
ALTER TABLE `AnalysisCategory`
ADD COLUMN `order` INTEGER NULL DEFAULT 0,
MODIFY `description` TEXT NULL;

-- CreateIndex
CREATE INDEX `AnalysisCategory_order_idx`
ON `AnalysisCategory`(`order`);