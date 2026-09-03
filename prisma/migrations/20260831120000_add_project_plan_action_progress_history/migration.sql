-- CreateTable
CREATE TABLE `ProjectPlanActionProgressHistory` (
    `id` VARCHAR(191) NOT NULL,
    `actionId` VARCHAR(191) NOT NULL,
    `progress` INTEGER NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectPlanActionProgressHistory_actionId_idx`(`actionId`),
    INDEX `ProjectPlanActionProgressHistory_updatedBy_idx`(`updatedBy`),
    INDEX `ProjectPlanActionProgressHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectPlanActionProgressHistory` ADD CONSTRAINT `ProjectPlanActionProgressHistory_actionId_fkey` FOREIGN KEY (`actionId`) REFERENCES `ProjectPlanAction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlanActionProgressHistory` ADD CONSTRAINT `ProjectPlanActionProgressHistory_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
