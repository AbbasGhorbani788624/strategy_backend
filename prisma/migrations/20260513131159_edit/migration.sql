/*
  Warnings:

  - You are about to alter the column `status` on the `project` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `Enum(EnumId(3))`.

*/
-- AlterTable
ALTER TABLE `project` MODIFY `status` ENUM('WAITING_FOR_FORM', 'ANALYSIS_PENDING', 'REVIEWING', 'CHAT_MODE', 'RISK_ANALYSIS', 'FINAL_ANALYSIS') NOT NULL DEFAULT 'WAITING_FOR_FORM';
