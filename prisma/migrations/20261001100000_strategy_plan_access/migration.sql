-- AlterTable NotificationType (MySQL: alter enum)
ALTER TABLE `Notification` MODIFY `type` ENUM(
  'PROJECT_ACCESS_GRANTED',
  'FOLLOW_UP_ANSWERED',
  'FORM_COLLABORATION_INVITE',
  'FORM_COLLABORATION_RESPONSE_SUBMITTED',
  'STRATEGY_PLAN_ACCESS_GRANTED'
) NOT NULL;

-- CreateTable
CREATE TABLE `StrategyPlanAccess` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `companyId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permission` ENUM('VIEW', 'EDIT') NOT NULL DEFAULT 'EDIT',
    `grantedByUserId` VARCHAR(191) NOT NULL,
    `revokedAt` DATETIME(3) NULL,

    INDEX `StrategyPlanAccess_planId_userId_idx`(`planId`, `userId`),
    INDEX `StrategyPlanAccess_userId_companyId_idx`(`userId`, `companyId`),
    INDEX `StrategyPlanAccess_planId_revokedAt_idx`(`planId`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StrategyPlanAccess` ADD CONSTRAINT `StrategyPlanAccess_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StrategyPlanAccess` ADD CONSTRAINT `StrategyPlanAccess_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `StrategyPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StrategyPlanAccess` ADD CONSTRAINT `StrategyPlanAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StrategyPlanAccess` ADD CONSTRAINT `StrategyPlanAccess_grantedByUserId_fkey` FOREIGN KEY (`grantedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
