/*
  Warnings:

  - You are about to drop the column `promptTemplate` on the `analysisform` table. All the data in the column will be lost.
  - You are about to alter the column `type` on the `formquestion` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `analysisform` DROP COLUMN `promptTemplate`;

-- AlterTable
ALTER TABLE `formquestion` MODIFY `type` ENUM('CHECKBOX', 'RADIO', 'DROPDOWN', 'TEXT', 'TEXTAREA', 'NUMBER') NOT NULL;

-- CreateTable
CREATE TABLE `FormPrompt` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormPrompt_formId_idx`(`formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormGoal` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormGoal_formId_idx`(`formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FormPrompt` ADD CONSTRAINT `FormPrompt_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormGoal` ADD CONSTRAINT `FormGoal_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
