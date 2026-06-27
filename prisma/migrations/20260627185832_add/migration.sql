-- CreateTable
CREATE TABLE `FormCategoryGroup` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormCategoryGroupItem` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `FormCategoryGroupItem_groupId_categoryId_key`(`groupId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FormCategoryGroup` ADD CONSTRAINT `FormCategoryGroup_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCategoryGroupItem` ADD CONSTRAINT `FormCategoryGroupItem_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `FormCategoryGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCategoryGroupItem` ADD CONSTRAINT `FormCategoryGroupItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `FormQuestionCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
