-- CreateTable
CREATE TABLE `StrategyPlan` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `framework` ENUM('BSC', 'OKR') NOT NULL,
    `status` ENUM('DRAFT', 'IN_PROGRESS', 'APPROVED', 'ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `state` ENUM('MAP_GENERATION', 'MAP_VALIDATION', 'KPI_GENERATION', 'KPI_VALIDATION', 'TABLE_GENERATION', 'TABLE_VALIDATION', 'READY_FOR_MONITORING', 'MONITORING', 'FAILED') NOT NULL DEFAULT 'MAP_GENERATION',
    `strategyText` TEXT NULL,
    `companyProfile` JSON NULL,

    INDEX `StrategyPlan_projectId_idx`(`projectId`),
    INDEX `StrategyPlan_companyId_idx`(`companyId`),
    INDEX `StrategyPlan_framework_idx`(`framework`),
    INDEX `StrategyPlan_status_idx`(`status`),
    INDEX `StrategyPlan_state_idx`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyMap` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `strategyPlanId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'VALIDATING', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `initialData` JSON NULL,
    `editedData` JSON NULL,
    `finalData` JSON NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,

    INDEX `StrategyMap_strategyPlanId_idx`(`strategyPlanId`),
    INDEX `StrategyMap_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyObjective` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `strategyPlanId` VARCHAR(191) NOT NULL,
    `mapId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `perspective` ENUM('FINANCIAL', 'CUSTOMER', 'INTERNAL_PROCESS', 'LEARNING_GROWTH') NULL,
    `learningGrowthCategory` ENUM('HUMAN_CAPITAL', 'INFORMATION_CAPITAL', 'ORGANIZATIONAL_CAPITAL') NULL,
    `priority` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `parentId` VARCHAR(191) NULL,

    INDEX `StrategyObjective_strategyPlanId_idx`(`strategyPlanId`),
    INDEX `StrategyObjective_mapId_idx`(`mapId`),
    INDEX `StrategyObjective_perspective_idx`(`perspective`),
    INDEX `StrategyObjective_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyObjectiveRelation` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fromObjectiveId` VARCHAR(191) NOT NULL,
    `toObjectiveId` VARCHAR(191) NOT NULL,

    INDEX `StrategyObjectiveRelation_fromObjectiveId_idx`(`fromObjectiveId`),
    INDEX `StrategyObjectiveRelation_toObjectiveId_idx`(`toObjectiveId`),
    UNIQUE INDEX `StrategyObjectiveRelation_fromObjectiveId_toObjectiveId_key`(`fromObjectiveId`, `toObjectiveId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyMeasure` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `strategyPlanId` VARCHAR(191) NOT NULL,
    `objectiveId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(191) NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
    `baseline` DECIMAL(20, 4) NULL,
    `finalTarget` DECIMAL(20, 4) NULL,
    `ownerId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'VALIDATING', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,

    INDEX `StrategyMeasure_strategyPlanId_idx`(`strategyPlanId`),
    INDEX `StrategyMeasure_objectiveId_idx`(`objectiveId`),
    INDEX `StrategyMeasure_ownerId_idx`(`ownerId`),
    INDEX `StrategyMeasure_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyMeasureTarget` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `measureId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `targetValue` DECIMAL(20, 4) NOT NULL,

    INDEX `StrategyMeasureTarget_measureId_idx`(`measureId`),
    INDEX `StrategyMeasureTarget_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    UNIQUE INDEX `StrategyMeasureTarget_measureId_periodStart_periodEnd_key`(`measureId`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyMeasureMeasurement` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `measureId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `actualValue` DECIMAL(20, 4) NOT NULL,
    `note` TEXT NULL,
    `submittedById` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StrategyMeasureMeasurement_measureId_idx`(`measureId`),
    INDEX `StrategyMeasureMeasurement_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    UNIQUE INDEX `StrategyMeasureMeasurement_measureId_periodStart_periodEnd_key`(`measureId`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyAiRun` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `strategyPlanId` VARCHAR(191) NOT NULL,
    `framework` ENUM('BSC', 'OKR') NOT NULL,
    `state` ENUM('MAP_GENERATION', 'MAP_VALIDATION', 'KPI_GENERATION', 'KPI_VALIDATION', 'TABLE_GENERATION', 'TABLE_VALIDATION', 'READY_FOR_MONITORING', 'MONITORING', 'FAILED') NOT NULL,
    `requestPayload` JSON NOT NULL,
    `responsePayload` JSON NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `StrategyAiRun_strategyPlanId_idx`(`strategyPlanId`),
    INDEX `StrategyAiRun_state_idx`(`state`),
    INDEX `StrategyAiRun_success_idx`(`success`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StrategyApproval` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `strategyPlanId` VARCHAR(191) NOT NULL,
    `type` ENUM('MAP', 'MEASURES') NOT NULL,
    `version` INTEGER NOT NULL,
    `approvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StrategyApproval_strategyPlanId_idx`(`strategyPlanId`),
    INDEX `StrategyApproval_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StrategyPlan` ADD CONSTRAINT `StrategyPlan_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyPlan` ADD CONSTRAINT `StrategyPlan_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMap` ADD CONSTRAINT `StrategyMap_strategyPlanId_fkey` FOREIGN KEY (`strategyPlanId`) REFERENCES `StrategyPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMap` ADD CONSTRAINT `StrategyMap_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyObjective` ADD CONSTRAINT `StrategyObjective_strategyPlanId_fkey` FOREIGN KEY (`strategyPlanId`) REFERENCES `StrategyPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyObjective` ADD CONSTRAINT `StrategyObjective_mapId_fkey` FOREIGN KEY (`mapId`) REFERENCES `StrategyMap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyObjective` ADD CONSTRAINT `StrategyObjective_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `StrategyObjective`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyObjectiveRelation` ADD CONSTRAINT `StrategyObjectiveRelation_fromObjectiveId_fkey` FOREIGN KEY (`fromObjectiveId`) REFERENCES `StrategyObjective`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyObjectiveRelation` ADD CONSTRAINT `StrategyObjectiveRelation_toObjectiveId_fkey` FOREIGN KEY (`toObjectiveId`) REFERENCES `StrategyObjective`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasure` ADD CONSTRAINT `StrategyMeasure_strategyPlanId_fkey` FOREIGN KEY (`strategyPlanId`) REFERENCES `StrategyPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasure` ADD CONSTRAINT `StrategyMeasure_objectiveId_fkey` FOREIGN KEY (`objectiveId`) REFERENCES `StrategyObjective`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasure` ADD CONSTRAINT `StrategyMeasure_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasure` ADD CONSTRAINT `StrategyMeasure_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasureTarget` ADD CONSTRAINT `StrategyMeasureTarget_measureId_fkey` FOREIGN KEY (`measureId`) REFERENCES `StrategyMeasure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasureMeasurement` ADD CONSTRAINT `StrategyMeasureMeasurement_measureId_fkey` FOREIGN KEY (`measureId`) REFERENCES `StrategyMeasure`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyMeasureMeasurement` ADD CONSTRAINT `StrategyMeasureMeasurement_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyAiRun` ADD CONSTRAINT `StrategyAiRun_strategyPlanId_fkey` FOREIGN KEY (`strategyPlanId`) REFERENCES `StrategyPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StrategyApproval` ADD CONSTRAINT `StrategyApproval_strategyPlanId_fkey` FOREIGN KEY (`strategyPlanId`) REFERENCES `StrategyPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
