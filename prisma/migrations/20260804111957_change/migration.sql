-- AlterTable
ALTER TABLE `company` MODIFY `industry` TEXT NULL;

-- AlterTable
ALTER TABLE `companybasicinfo` MODIFY `brandTitle` TEXT NULL,
    MODIFY `knownAs` TEXT NULL;

-- AlterTable
ALTER TABLE `companymarket` MODIFY `marketName` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `formcategorygroup` MODIFY `title` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `formquestion` MODIFY `label` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `formquestionoption` MODIFY `label` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `industryinsight` MODIFY `title` TEXT NULL;

-- AlterTable
ALTER TABLE `notification` MODIFY `message` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `project` MODIFY `title` TEXT NOT NULL;
