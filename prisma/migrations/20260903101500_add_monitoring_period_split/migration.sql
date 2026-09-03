-- AlterTable
ALTER TABLE `StrategyMeasure` ADD COLUMN `monitoringDurationDays` INTEGER NULL,
    ADD COLUMN `measurementPeriodLabel` VARCHAR(191) NULL,
    ADD COLUMN `periodSplitBy` ENUM('DAY', 'WEEK', 'MONTH') NULL;
