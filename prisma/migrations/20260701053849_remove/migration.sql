/*
  Warnings:

  - You are about to drop the column `isHolding` on the `companybasicinfo` table. All the data in the column will be lost.
  - You are about to drop the column `isHoldingSubsidiary` on the `companybasicinfo` table. All the data in the column will be lost.
  - You are about to drop the column `isListed` on the `companybasicinfo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `companybasicinfo` DROP COLUMN `isHolding`,
    DROP COLUMN `isHoldingSubsidiary`,
    DROP COLUMN `isListed`;
