-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'COMPANY', 'MEMBER') NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `profile` JSON NULL,
    `progress` JSON NULL,
    `profileCompleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phoneNumber_key`(`phoneNumber`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileViewAccess` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `section` ENUM('BASIC', 'FINANCIAL', 'STRATEGY', 'HR', 'CONTACT') NOT NULL,

    INDEX `ProfileViewAccess_companyId_idx`(`companyId`),
    UNIQUE INDEX `ProfileViewAccess_userId_section_key`(`userId`, `section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyAdminData` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyAdminData_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `mode` ENUM('SINGLE', 'MULTI') NOT NULL DEFAULT 'SINGLE',
    `status` ENUM('WAITING_FOR_FORM', 'ANALYSIS_PENDING', 'REVIEWING', 'CHAT_MODE', 'FINAL_ANALYSIS') NOT NULL DEFAULT 'WAITING_FOR_FORM',
    `formResponses` JSON NULL,
    `formId` VARCHAR(191) NULL,
    `multiAnalysisFormId` VARCHAR(191) NULL,
    `summaryAnalysis` VARCHAR(191) NULL,
    `promptVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `initialAnalysis` TEXT NULL,
    `riskAnalysis` TEXT NULL,
    `finalAnalysis` TEXT NULL,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `hasRating` BOOLEAN NOT NULL DEFAULT false,
    `chatModeStartedAt` DATETIME(3) NULL,
    `chatModeEndedAt` DATETIME(3) NULL,

    INDEX `Project_status_idx`(`status`),
    INDEX `Project_companyId_idx`(`companyId`),
    INDEX `Project_formId_idx`(`formId`),
    INDEX `Project_multiAnalysisFormId_idx`(`multiAnalysisFormId`),
    INDEX `Project_promptVersionId_idx`(`promptVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectRatingHistory` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `raterId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectRatingHistory_projectId_idx`(`projectId`),
    INDEX `ProjectRatingHistory_raterId_idx`(`raterId`),
    UNIQUE INDEX `ProjectRatingHistory_projectId_raterId_key`(`projectId`, `raterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatMessage_projectId_idx`(`projectId`),
    INDEX `ChatMessage_userId_idx`(`userId`),
    INDEX `ChatMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalysisForm` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `info` VARCHAR(191) NULL,
    `order` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `temperature` DOUBLE NOT NULL DEFAULT 0.7,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AnalysisForm_isActive_idx`(`isActive`),
    INDEX `AnalysisForm_order_idx`(`order`),
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

-- CreateTable
CREATE TABLE `ProjectGoal` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectGoal_projectId_idx`(`projectId`),
    INDEX `ProjectGoal_goalId_idx`(`goalId`),
    UNIQUE INDEX `ProjectGoal_projectId_goalId_key`(`projectId`, `goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FormQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` ENUM('CHECKBOX', 'RADIO', 'NUMBER') NOT NULL,
    `options` JSON NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL,

    INDEX `FormQuestion_formId_order_idx`(`formId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('ADMIN_FEEDBACK', 'PROJECT_RATED', 'PROJECT_ACCESS_GRANTED', 'FOLLOW_UP_ANSWERED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `referenceId` VARCHAR(191) NULL,
    `referenceType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_isRead_idx`(`userId`, `isRead`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectAccess` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectAccess_projectId_idx`(`projectId`),
    INDEX `ProjectAccess_userId_idx`(`userId`),
    UNIQUE INDEX `ProjectAccess_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisRequiredForm` (
    `id` VARCHAR(191) NOT NULL,
    `multiAnalysisFormId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MultiAnalysisRequiredForm_multiAnalysisFormId_order_idx`(`multiAnalysisFormId`, `order`),
    INDEX `MultiAnalysisRequiredForm_formId_idx`(`formId`),
    UNIQUE INDEX `MultiAnalysisRequiredForm_multiAnalysisFormId_formId_key`(`multiAnalysisFormId`, `formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisProjectSource` (
    `id` VARCHAR(191) NOT NULL,
    `multiProjectId` VARCHAR(191) NOT NULL,
    `sourceProjectId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MultiAnalysisProjectSource_multiProjectId_idx`(`multiProjectId`),
    INDEX `MultiAnalysisProjectSource_sourceProjectId_idx`(`sourceProjectId`),
    INDEX `MultiAnalysisProjectSource_formId_idx`(`formId`),
    UNIQUE INDEX `MultiAnalysisProjectSource_multiProjectId_formId_key`(`multiProjectId`, `formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisForm` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `temperature` DOUBLE NOT NULL DEFAULT 0.7,

    INDEX `MultiAnalysisForm_isActive_idx`(`isActive`),
    INDEX `MultiAnalysisForm_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisGoal` (
    `id` VARCHAR(191) NOT NULL,
    `multiAnalysisFormId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MultiAnalysisGoal_multiAnalysisFormId_idx`(`multiAnalysisFormId`),
    UNIQUE INDEX `MultiAnalysisGoal_multiAnalysisFormId_title_key`(`multiAnalysisFormId`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectMultiGoal` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectMultiGoal_projectId_idx`(`projectId`),
    INDEX `ProjectMultiGoal_goalId_idx`(`goalId`),
    UNIQUE INDEX `ProjectMultiGoal_projectId_goalId_key`(`projectId`, `goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `type` ENUM('CHECKBOX', 'RADIO', 'NUMBER') NOT NULL,
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

-- CreateTable
CREATE TABLE `PromptDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `ownerType` ENUM('ANALYSIS_FORM', 'MULTI_ANALYSIS_FORM') NOT NULL,
    `title` VARCHAR(191) NULL,
    `analysisFormId` VARCHAR(191) NULL,
    `multiAnalysisFormId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromptDefinition_analysisFormId_key`(`analysisFormId`),
    UNIQUE INDEX `PromptDefinition_multiAnalysisFormId_key`(`multiAnalysisFormId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptSegmentDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `promptDefinitionId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PromptSegmentDefinition_promptDefinitionId_sortOrder_idx`(`promptDefinitionId`, `sortOrder`),
    UNIQUE INDEX `PromptSegmentDefinition_promptDefinitionId_key_key`(`promptDefinitionId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptVersion` (
    `id` VARCHAR(191) NOT NULL,
    `promptDefinitionId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `versionKey` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromptVersion_promptDefinitionId_versionNumber_key`(`promptDefinitionId`, `versionNumber`),
    UNIQUE INDEX `PromptVersion_promptDefinitionId_versionKey_key`(`promptDefinitionId`, `versionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptVersionSegmentValue` (
    `id` VARCHAR(191) NOT NULL,
    `promptVersionId` VARCHAR(191) NOT NULL,
    `segmentDefinitionId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromptVersionSegmentValue_promptVersionId_segmentDefinitionI_key`(`promptVersionId`, `segmentDefinitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `industry` VARCHAR(191) NULL,
    `userLimit` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyBasicInfo` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `brandTitle` VARCHAR(191) NULL,
    `nationalId` VARCHAR(191) NULL,
    `companyType` VARCHAR(191) NULL,
    `establishmentYear` VARCHAR(191) NULL,
    `commercialActivityStartYear` VARCHAR(191) NULL,
    `isListed` BOOLEAN NULL,
    `isHolding` BOOLEAN NULL,
    `isHoldingSubsidiary` BOOLEAN NULL,
    `parentCompanyName` VARCHAR(191) NULL,
    `totalPersonnelCount` INTEGER NULL,
    `operationalPersonnelCount` INTEGER NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,

    UNIQUE INDEX `CompanyBasicInfo_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyManager` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `positionTitle` VARCHAR(191) NULL,
    `isBoardMember` BOOLEAN NULL,
    `isStrategyTeamMember` BOOLEAN NULL,
    `companyWorkExperience` INTEGER NULL,
    `totalWorkExperience` INTEGER NULL,
    `resumeFileId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanyManager_companyId_idx`(`companyId`),
    INDEX `CompanyManager_resumeFileId_idx`(`resumeFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RevenueCenter` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `activityYearsCount` INTEGER NULL,
    `totalRevenueSharePercent` DECIMAL(5, 2) NULL,
    `personnelCount` INTEGER NULL,
    `sortOrder` INTEGER NULL,

    INDEX `RevenueCenter_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyShareholder` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shareholderType` VARCHAR(191) NULL,
    `isBoardMember` BOOLEAN NULL,
    `hasPreferredShare` BOOLEAN NULL,
    `sharePercent` DECIMAL(5, 2) NULL,

    INDEX `CompanyShareholder_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationUnit` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `unitName` VARCHAR(191) NOT NULL,
    `structureLevel` VARCHAR(191) NULL,
    `isRevenueCenter` BOOLEAN NULL,
    `parentUnitName` VARCHAR(191) NULL,
    `managerName` VARCHAR(191) NULL,
    `employeeCount` INTEGER NULL,
    `structureFileId` VARCHAR(191) NULL,

    INDEX `OrganizationUnit_companyId_idx`(`companyId`),
    INDEX `OrganizationUnit_structureFileId_idx`(`structureFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyLicenseCertificate` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `issuerReference` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NULL,
    `type` VARCHAR(191) NULL,
    `attachmentFileId` VARCHAR(191) NULL,

    INDEX `CompanyLicenseCertificate_companyId_idx`(`companyId`),
    INDEX `CompanyLicenseCertificate_attachmentFileId_idx`(`attachmentFileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyMembership` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `associationName` VARCHAR(191) NOT NULL,
    `membershipDate` DATETIME(3) NULL,
    `isBoardMember` BOOLEAN NULL,

    INDEX `CompanyMembership_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyProductService` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `revenueCenter` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `revenueSharePercent` VARCHAR(191) NULL,
    `distinctiveFeatures` VARCHAR(191) NULL,
    `startYear` INTEGER NULL,
    `marketPosition` VARCHAR(191) NULL,
    `isExported` BOOLEAN NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanyProductService_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyMarket` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `marketName` VARCHAR(191) NOT NULL,
    `marketType` VARCHAR(191) NULL,
    `marketSharePercent` DECIMAL(5, 2) NULL,
    `marketPenetrationLevel` VARCHAR(191) NULL,
    `yearsInMarket` INTEGER NULL,
    `relatedProductService` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanyMarket_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KeyCustomer` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `businessField` VARCHAR(191) NULL,
    `productImportanceLevel` VARCHAR(191) NULL,
    `revenueImpactLevel` VARCHAR(191) NULL,
    `loyaltyLevel` VARCHAR(191) NULL,
    `walletShareLevel` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `KeyCustomer_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyBalanceSheet` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `fiscalPeriodStart` DATETIME(3) NULL,
    `fiscalPeriodEnd` DATETIME(3) NULL,
    `category` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NULL,
    `balanceFileId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanyBalanceSheet_companyId_idx`(`companyId`),
    INDEX `CompanyBalanceSheet_balanceFileId_idx`(`balanceFileId`),
    INDEX `CompanyBalanceSheet_fiscalPeriodStart_fiscalPeriodEnd_idx`(`fiscalPeriodStart`, `fiscalPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyIncomeStatement` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `fiscalPeriodStart` DATETIME(3) NULL,
    `fiscalPeriodEnd` DATETIME(3) NULL,
    `category` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NULL,
    `incomeFileId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,

    INDEX `CompanyIncomeStatement_companyId_idx`(`companyId`),
    INDEX `CompanyIncomeStatement_incomeFileId_idx`(`incomeFileId`),
    INDEX `CompanyIncomeStatement_fiscalPeriodStart_fiscalPeriodEnd_idx`(`fiscalPeriodStart`, `fiscalPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyResourceCapability` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `capability` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `importanceLevel` VARCHAR(191) NULL,
    `availabilityLevel` VARCHAR(191) NULL,
    `rarityLevel` VARCHAR(191) NULL,
    `inimitabilityLevel` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `CompanyResourceCapability_companyId_idx`(`companyId`),
    INDEX `CompanyResourceCapability_companyId_sortOrder_idx`(`companyId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `originalName` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `filePath` VARCHAR(191) NULL,
    `uploadKey` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `extension` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `uploadedById` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalysisFormProfileField` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `profileFieldKey` VARCHAR(191) NOT NULL,
    `isArray` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AnalysisFormProfileField_formId_profileFieldKey_key`(`formId`, `profileFieldKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MultiAnalysisFormProfileField` (
    `id` VARCHAR(191) NOT NULL,
    `multiAnalysisFormId` VARCHAR(191) NOT NULL,
    `profileFieldKey` VARCHAR(191) NOT NULL,
    `isArray` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MultiAnalysisFormProfileField_multiAnalysisFormId_profileFie_key`(`multiAnalysisFormId`, `profileFieldKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileViewAccess` ADD CONSTRAINT `ProfileViewAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileViewAccess` ADD CONSTRAINT `ProfileViewAccess_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAdminData` ADD CONSTRAINT `CompanyAdminData_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_promptVersionId_fkey` FOREIGN KEY (`promptVersionId`) REFERENCES `PromptVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectRatingHistory` ADD CONSTRAINT `ProjectRatingHistory_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectRatingHistory` ADD CONSTRAINT `ProjectRatingHistory_raterId_fkey` FOREIGN KEY (`raterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormGoal` ADD CONSTRAINT `FormGoal_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectGoal` ADD CONSTRAINT `ProjectGoal_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectGoal` ADD CONSTRAINT `ProjectGoal_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `FormGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FormQuestion` ADD CONSTRAINT `FormQuestion_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectAccess` ADD CONSTRAINT `ProjectAccess_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectAccess` ADD CONSTRAINT `ProjectAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisRequiredForm` ADD CONSTRAINT `MultiAnalysisRequiredForm_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisRequiredForm` ADD CONSTRAINT `MultiAnalysisRequiredForm_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_multiProjectId_fkey` FOREIGN KEY (`multiProjectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_sourceProjectId_fkey` FOREIGN KEY (`sourceProjectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisProjectSource` ADD CONSTRAINT `MultiAnalysisProjectSource_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisGoal` ADD CONSTRAINT `MultiAnalysisGoal_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMultiGoal` ADD CONSTRAINT `ProjectMultiGoal_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMultiGoal` ADD CONSTRAINT `ProjectMultiGoal_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `MultiAnalysisGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpFormQuestion` ADD CONSTRAINT `FollowUpFormQuestion_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FollowUpForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `FollowUpForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpRequest` ADD CONSTRAINT `FollowUpRequest_answeredById_fkey` FOREIGN KEY (`answeredById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptDefinition` ADD CONSTRAINT `PromptDefinition_analysisFormId_fkey` FOREIGN KEY (`analysisFormId`) REFERENCES `AnalysisForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptDefinition` ADD CONSTRAINT `PromptDefinition_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptSegmentDefinition` ADD CONSTRAINT `PromptSegmentDefinition_promptDefinitionId_fkey` FOREIGN KEY (`promptDefinitionId`) REFERENCES `PromptDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersion` ADD CONSTRAINT `PromptVersion_promptDefinitionId_fkey` FOREIGN KEY (`promptDefinitionId`) REFERENCES `PromptDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersionSegmentValue` ADD CONSTRAINT `PromptVersionSegmentValue_promptVersionId_fkey` FOREIGN KEY (`promptVersionId`) REFERENCES `PromptVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersionSegmentValue` ADD CONSTRAINT `PromptVersionSegmentValue_segmentDefinitionId_fkey` FOREIGN KEY (`segmentDefinitionId`) REFERENCES `PromptSegmentDefinition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyBasicInfo` ADD CONSTRAINT `CompanyBasicInfo_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyManager` ADD CONSTRAINT `CompanyManager_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyManager` ADD CONSTRAINT `CompanyManager_resumeFileId_fkey` FOREIGN KEY (`resumeFileId`) REFERENCES `FileAttachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueCenter` ADD CONSTRAINT `RevenueCenter_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyShareholder` ADD CONSTRAINT `CompanyShareholder_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationUnit` ADD CONSTRAINT `OrganizationUnit_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationUnit` ADD CONSTRAINT `OrganizationUnit_structureFileId_fkey` FOREIGN KEY (`structureFileId`) REFERENCES `FileAttachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyLicenseCertificate` ADD CONSTRAINT `CompanyLicenseCertificate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyLicenseCertificate` ADD CONSTRAINT `CompanyLicenseCertificate_attachmentFileId_fkey` FOREIGN KEY (`attachmentFileId`) REFERENCES `FileAttachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMembership` ADD CONSTRAINT `CompanyMembership_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyProductService` ADD CONSTRAINT `CompanyProductService_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMarket` ADD CONSTRAINT `CompanyMarket_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KeyCustomer` ADD CONSTRAINT `KeyCustomer_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyBalanceSheet` ADD CONSTRAINT `CompanyBalanceSheet_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyBalanceSheet` ADD CONSTRAINT `CompanyBalanceSheet_balanceFileId_fkey` FOREIGN KEY (`balanceFileId`) REFERENCES `FileAttachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyIncomeStatement` ADD CONSTRAINT `CompanyIncomeStatement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyIncomeStatement` ADD CONSTRAINT `CompanyIncomeStatement_incomeFileId_fkey` FOREIGN KEY (`incomeFileId`) REFERENCES `FileAttachment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyResourceCapability` ADD CONSTRAINT `CompanyResourceCapability_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileAttachment` ADD CONSTRAINT `FileAttachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalysisFormProfileField` ADD CONSTRAINT `AnalysisFormProfileField_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `AnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MultiAnalysisFormProfileField` ADD CONSTRAINT `MultiAnalysisFormProfileField_multiAnalysisFormId_fkey` FOREIGN KEY (`multiAnalysisFormId`) REFERENCES `MultiAnalysisForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
