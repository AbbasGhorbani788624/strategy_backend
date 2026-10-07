-- AlterTable
ALTER TABLE `ProjectAccess` ADD COLUMN `permission` ENUM('VIEW', 'EDIT') NOT NULL DEFAULT 'VIEW';
