/*
  Warnings:

  - You are about to drop the column `amount` on the `companybalancesheet` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `companybalancesheet` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalPeriodEnd` on the `companybalancesheet` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalPeriodStart` on the `companybalancesheet` table. All the data in the column will be lost.
  - You are about to drop the column `companyType` on the `companybasicinfo` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `companyincomestatement` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `companyincomestatement` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalPeriodEnd` on the `companyincomestatement` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalPeriodStart` on the `companyincomestatement` table. All the data in the column will be lost.
  - You are about to drop the column `availabilityLevel` on the `companyresourcecapability` table. All the data in the column will be lost.
  - You are about to drop the column `productImportanceLevel` on the `keycustomer` table. All the data in the column will be lost.
  - You are about to drop the column `yearsOfExperience` on the `usercompetency` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `CompanyBalanceSheet_fiscalPeriodStart_fiscalPeriodEnd_idx` ON `companybalancesheet`;

-- DropIndex
DROP INDEX `CompanyIncomeStatement_fiscalPeriodStart_fiscalPeriodEnd_idx` ON `companyincomestatement`;

-- AlterTable
ALTER TABLE `companybalancesheet` DROP COLUMN `amount`,
    DROP COLUMN `category`,
    DROP COLUMN `fiscalPeriodEnd`,
    DROP COLUMN `fiscalPeriodStart`,
    ADD COLUMN `year` INTEGER NULL;

-- AlterTable
ALTER TABLE `companybasicinfo` DROP COLUMN `companyType`,
    ADD COLUMN `isHolding` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isHoldingSubsidiary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPublicCompany` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `knownAs` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `companyincomestatement` DROP COLUMN `amount`,
    DROP COLUMN `category`,
    DROP COLUMN `fiscalPeriodEnd`,
    DROP COLUMN `fiscalPeriodStart`,
    ADD COLUMN `year` INTEGER NULL;

-- AlterTable
ALTER TABLE `companymarket` ADD COLUMN `targetMarketType` ENUM('PRIMARY', 'INDIVIDUAL') NULL;

-- AlterTable
ALTER TABLE `companymembership` ADD COLUMN `activityScope` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `companyresourcecapability` DROP COLUMN `availabilityLevel`;

-- AlterTable
ALTER TABLE `keycustomer` DROP COLUMN `productImportanceLevel`;

-- AlterTable
ALTER TABLE `revenuecenter` ADD COLUMN `lastYearEstimatedRevenue` DECIMAL(20, 0) NULL;

-- AlterTable
ALTER TABLE `usercompetency` DROP COLUMN `yearsOfExperience`;

-- CreateTable
CREATE TABLE `CompanySupplier` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `productOrService` VARCHAR(191) NULL,
    `bargainingPower` VARCHAR(191) NULL,
    `supplierMarket` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanySupplier_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyRawMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `materialName` VARCHAR(191) NOT NULL,
    `costImpactLevel` VARCHAR(191) NULL,
    `purchaseBudgetShare` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanyRawMaterial_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CompanyBalanceSheet_year_idx` ON `CompanyBalanceSheet`(`year`);

-- CreateIndex
CREATE INDEX `CompanyIncomeStatement_year_idx` ON `CompanyIncomeStatement`(`year`);

-- AddForeignKey
ALTER TABLE `CompanySupplier` ADD CONSTRAINT `CompanySupplier_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyRawMaterial` ADD CONSTRAINT `CompanyRawMaterial_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
