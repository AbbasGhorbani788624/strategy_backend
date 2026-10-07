-- ProjectAccess: VIEW|EDIT → canView, canAction, canVisualize
ALTER TABLE `ProjectAccess`
  ADD COLUMN `canView` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `canAction` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `canVisualize` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `grantedByUserId` VARCHAR(191) NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

UPDATE `ProjectAccess`
SET
  `canView` = true,
  `canAction` = false,
  `canVisualize` = false
WHERE `permission` IN ('VIEW', 'EDIT');

ALTER TABLE `ProjectAccess` DROP COLUMN `permission`;

ALTER TABLE `ProjectAccess`
  ADD CONSTRAINT `ProjectAccess_grantedByUserId_fkey`
  FOREIGN KEY (`grantedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
