-- AlterTable
ALTER TABLE `notification` MODIFY `type` ENUM('ADMIN_FEEDBACK', 'PROJECT_RATED', 'PROJECT_ACCESS_GRANTED', 'FOLLOW_UP_ANSWERED') NOT NULL;

-- CreateTable
CREATE TABLE `FollowUpForm` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FollowUpForm_isActive_idx`(`isActive`),
    INDEX `FollowUpForm_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FollowUpFormQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` ENUM('CHECKBOX', 'RADIO', 'DROPDOWN', 'TEXT', 'TEXTAREA', 'NUMBER') NOT NULL,
    `options` JSON NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL,

    INDEX `FollowUpFormQuestion_formId_order_idx`(`formId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FollowUpRequest` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ANSWERED') NOT NULL DEFAULT 'PENDING',
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NULL,
    `responses` JSON NOT NULL,
    `adminAnswer` TEXT NULL,
    `answeredAt` DATETIME(3) NULL,
    `answeredById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FollowUpRequest_projectId_idx`(`projectId`),
    INDEX `FollowUpRequest_userId_idx`(`userId`),
    INDEX `FollowUpRequest_formId_idx`(`formId`),
    INDEX `FollowUpRequest_status_idx`(`status`),
    INDEX `FollowUpRequest_createdAt_idx`(`createdAt`),
    INDEX `FollowUpRequest_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FollowUpFormQuestion` ADD CONSTRAINT `FollowUpFormQuestion_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FollowUpForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FollowUpForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_answeredById_fkey` FOREIGN KEY (`answeredById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
