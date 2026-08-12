-- AlterTable
ALTER TABLE `StrategyMeasure` ADD COLUMN `formula` TEXT NULL,
    ADD COLUMN `monitoringStartDate` DATETIME(3) NULL,
    ADD COLUMN `monitoringDurationMonths` INTEGER NULL,
    ADD COLUMN `monitoringStatus` ENUM('DRAFT', 'LOCKED') NULL;

-- AlterTable
ALTER TABLE `StrategyMeasureTarget` ADD COLUMN `periodLabel` VARCHAR(191) NULL,
    MODIFY `targetValue` DECIMAL(20, 4) NULL;

-- CreateIndex
CREATE INDEX `StrategyMeasure_monitoringStatus_idx` ON `StrategyMeasure`(`monitoringStatus`);
