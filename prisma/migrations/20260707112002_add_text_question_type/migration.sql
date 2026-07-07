-- AlterTable
ALTER TABLE `followupformquestion` MODIFY `type` ENUM('CHECKBOX', 'RADIO', 'NUMBER', 'TEXT') NOT NULL;

-- AlterTable
ALTER TABLE `formquestion` MODIFY `type` ENUM('CHECKBOX', 'RADIO', 'NUMBER', 'TEXT') NOT NULL;
