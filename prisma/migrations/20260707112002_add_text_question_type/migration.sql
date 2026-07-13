-- AlterTable
ALTER TABLE `FollowUpFormQuestion`
MODIFY `type` ENUM('CHECKBOX', 'RADIO', 'NUMBER', 'TEXT') NOT NULL;

-- AlterTable
ALTER TABLE `FormQuestion`
MODIFY `type` ENUM('CHECKBOX', 'RADIO', 'NUMBER', 'TEXT') NOT NULL;