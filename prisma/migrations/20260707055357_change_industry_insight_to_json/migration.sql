/*
  Warnings:

  - You are about to drop the column `insightText` on the `industryinsight` table. All the data in the column will be lost.
  - Added the required column `insightData` to the `IndustryInsight` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `industryinsight` DROP COLUMN `insightText`,
    ADD COLUMN `insightData` JSON NOT NULL;
