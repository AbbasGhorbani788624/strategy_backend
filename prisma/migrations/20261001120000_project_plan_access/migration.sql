-- AlterTable NotificationType (MySQL: alter enum)
ALTER TABLE `Notification` MODIFY `type` ENUM(
  'PROJECT_ACCESS_GRANTED',
  'FOLLOW_UP_ANSWERED',
  'FORM_COLLABORATION_INVITE',
  'FORM_COLLABORATION_RESPONSE_SUBMITTED',
  'STRATEGY_PLAN_ACCESS_GRANTED',
  'PROJECT_PLAN_ACCESS_GRANTED'
) NOT NULL;

-- CreateTable
CREATE TABLE `ProjectPlanAccess` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,
    `projectPlanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permission` ENUM('VIEW', 'EDIT') NOT NULL DEFAULT 'EDIT',
    `grantedByUserId` VARCHAR(191) NOT NULL,
    `revokedAt` DATETIME(3) NULL,

    INDEX `ProjectPlanAccess_projectPlanId_userId_idx`(`projectPlanId`, `userId`),
    INDEX `ProjectPlanAccess_userId_companyId_idx`(`userId`, `companyId`),
    INDEX `ProjectPlanAccess_projectPlanId_revokedAt_idx`(`projectPlanId`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProjectPlanAccess` ADD CONSTRAINT `ProjectPlanAccess_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProjectPlanAccess` ADD CONSTRAINT `ProjectPlanAccess_projectPlanId_fkey` FOREIGN KEY (`projectPlanId`) REFERENCES `ProjectPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProjectPlanAccess` ADD CONSTRAINT `ProjectPlanAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProjectPlanAccess` ADD CONSTRAINT `ProjectPlanAccess_grantedByUserId_fkey` FOREIGN KEY (`grantedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
