/*
  Warnings:

  - You are about to drop the `projectfeedbackrequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stepflow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stepflowitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stepsession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `projectfeedbackrequest` DROP FOREIGN KEY `ProjectFeedbackRequest_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `projectfeedbackrequest` DROP FOREIGN KEY `ProjectFeedbackRequest_userId_fkey`;

-- DropForeignKey
ALTER TABLE `stepflowitem` DROP FOREIGN KEY `StepFlowItem_flowId_fkey`;

-- DropForeignKey
ALTER TABLE `stepflowitem` DROP FOREIGN KEY `StepFlowItem_formId_fkey`;

-- DropForeignKey
ALTER TABLE `stepsession` DROP FOREIGN KEY `StepSession_flowId_fkey`;

-- DropForeignKey
ALTER TABLE `stepsession` DROP FOREIGN KEY `StepSession_userId_fkey`;

-- DropTable
DROP TABLE `projectfeedbackrequest`;

-- DropTable
DROP TABLE `stepflow`;

-- DropTable
DROP TABLE `stepflowitem`;

-- DropTable
DROP TABLE `stepsession`;
