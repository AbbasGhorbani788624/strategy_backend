-- AlterTable
ALTER TABLE `StrategyMeasure` ADD COLUMN `desirability` ENUM('INCREASING', 'DECREASING', 'ON_TARGET') NULL;
