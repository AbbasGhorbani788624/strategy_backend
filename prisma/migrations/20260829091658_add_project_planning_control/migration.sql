-- CreateTable
CREATE TABLE `ProjectPlan` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'LOCKED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectPlan_projectId_key`(`projectId`),
    INDEX `ProjectPlan_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectPlanAction` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `executorId` VARCHAR(191) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `completedAt` DATETIME(3) NULL,
    `order` INTEGER NOT NULL,
    `prerequisiteActionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProjectPlanAction_planId_idx`(`planId`),
    INDEX `ProjectPlanAction_executorId_idx`(`executorId`),
    INDEX `ProjectPlanAction_prerequisiteActionId_idx`(`prerequisiteActionId`),
    INDEX `ProjectPlanAction_status_idx`(`status`),
    INDEX `ProjectPlanAction_startDate_idx`(`startDate`),
    INDEX `ProjectPlanAction_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectPlan` ADD CONSTRAINT `ProjectPlan_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlanAction` ADD CONSTRAINT `ProjectPlanAction_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `ProjectPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlanAction` ADD CONSTRAINT `ProjectPlanAction_executorId_fkey` FOREIGN KEY (`executorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPlanAction` ADD CONSTRAINT `ProjectPlanAction_prerequisiteActionId_fkey` FOREIGN KEY (`prerequisiteActionId`) REFERENCES `ProjectPlanAction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
