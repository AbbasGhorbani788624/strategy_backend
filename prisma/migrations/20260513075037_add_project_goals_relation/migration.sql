-- CreateTable
CREATE TABLE `ProjectGoal` (
    `projectId` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectGoal_goalId_idx`(`goalId`),
    PRIMARY KEY (`projectId`, `goalId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectGoal` ADD CONSTRAINT `ProjectGoal_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectGoal` ADD CONSTRAINT `ProjectGoal_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `FormGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
