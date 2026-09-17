-- AlterTable
ALTER TABLE `analysisform` ADD COLUMN `directFinalAnalysis` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `multianalysisform` ADD COLUMN `directFinalAnalysis` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `project` ADD COLUMN `directFinalAnalysis` BOOLEAN NOT NULL DEFAULT false;
