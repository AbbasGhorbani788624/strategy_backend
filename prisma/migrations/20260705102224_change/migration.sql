/*
  Warnings:

  - You are about to alter the column `relatedProductService` on the `companymarket` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `companymarket` MODIFY `relatedProductService` JSON NULL;
