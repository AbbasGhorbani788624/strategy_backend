-- AlterTable
ALTER TABLE `Notification` MODIFY `type` ENUM('PROJECT_ACCESS_GRANTED', 'FOLLOW_UP_ANSWERED', 'FORM_COLLABORATION_INVITE', 'FORM_COLLABORATION_RESPONSE_SUBMITTED') NOT NULL;

-- CreateTable
CREATE TABLE `FormCollaboration` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `createdById` VARCHAR(191) NOT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `appliedAt` DATETIME(3) NULL,
    `appliedById` VARCHAR(191) NULL,
    `minSubmittedCount` INTEGER NULL,
    `requireAllDelegationsCompleted` BOOLEAN NOT NULL DEFAULT false,
    `tieOverrides` JSON NULL,

    UNIQUE INDEX `FormCollaboration_projectId_key`(`projectId`),
    INDEX `FormCollaboration_status_idx`(`status`),
    INDEX `FormCollaboration_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormCollaborationResponse` (
    `id` VARCHAR(191) NOT NULL,
    `collaborationId` VARCHAR(191) NOT NULL,
    `respondentId` VARCHAR(191) NOT NULL,
    `rawAnswers` JSON NOT NULL,
    `formattedResponses` JSON NULL,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormCollaborationResponse_collaborationId_idx`(`collaborationId`),
    INDEX `FormCollaborationResponse_respondentId_idx`(`respondentId`),
    UNIQUE INDEX `FormCollaborationResponse_collaborationId_respondentId_key`(`collaborationId`, `respondentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormCollaborationDelegation` (
    `id` VARCHAR(191) NOT NULL,
    `collaborationId` VARCHAR(191) NOT NULL,
    `assigneeId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `mode` ENUM('FILL', 'READ_ONLY') NOT NULL,
    `status` ENUM('PENDING', 'VIEWED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `snapshotResponses` JSON NULL,
    `message` TEXT NULL,
    `dueAt` DATETIME(3) NULL,
    `linkedResponseId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FormCollaborationDelegation_assigneeId_status_idx`(`assigneeId`, `status`),
    INDEX `FormCollaborationDelegation_collaborationId_idx`(`collaborationId`),
    UNIQUE INDEX `FormCollaborationDelegation_collaborationId_assigneeId_key`(`collaborationId`, `assigneeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FormCollaboration` ADD CONSTRAINT `FormCollaboration_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaboration` ADD CONSTRAINT `FormCollaboration_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaboration` ADD CONSTRAINT `FormCollaboration_appliedById_fkey` FOREIGN KEY (`appliedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaborationResponse` ADD CONSTRAINT `FormCollaborationResponse_collaborationId_fkey` FOREIGN KEY (`collaborationId`) REFERENCES `FormCollaboration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaborationResponse` ADD CONSTRAINT `FormCollaborationResponse_respondentId_fkey` FOREIGN KEY (`respondentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaborationDelegation` ADD CONSTRAINT `FormCollaborationDelegation_collaborationId_fkey` FOREIGN KEY (`collaborationId`) REFERENCES `FormCollaboration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaborationDelegation` ADD CONSTRAINT `FormCollaborationDelegation_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaborationDelegation` ADD CONSTRAINT `FormCollaborationDelegation_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormCollaborationDelegation` ADD CONSTRAINT `FormCollaborationDelegation_linkedResponseId_fkey` FOREIGN KEY (`linkedResponseId`) REFERENCES `FormCollaborationResponse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
