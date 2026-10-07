-- Deduplicate BSC plans (keep newest per company). MySQL 8+ window functions.
DELETE FROM `StrategyPlan`
WHERE `id` IN (
  SELECT `id` FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `companyId`
        ORDER BY `updatedAt` DESC, `createdAt` DESC
      ) AS rn
    FROM `StrategyPlan`
    WHERE `framework` = 'BSC' AND `status` <> 'ARCHIVED'
  ) AS ranked_bsc
  WHERE rn > 1
);

-- Deduplicate OKR plans (keep newest per company + project)
DELETE FROM `StrategyPlan`
WHERE `id` IN (
  SELECT `id` FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `companyId`, `projectId`
        ORDER BY `updatedAt` DESC, `createdAt` DESC
      ) AS rn
    FROM `StrategyPlan`
    WHERE `framework` = 'OKR' AND `status` <> 'ARCHIVED'
  ) AS ranked_okr
  WHERE rn > 1
);

-- Slot key: one active BSC per company, one active OKR per (company, project).
-- NULL when ARCHIVED so multiple archived rows are allowed (MySQL UNIQUE ignores NULLs).
ALTER TABLE `StrategyPlan`
  ADD COLUMN `activeSlotKey` VARCHAR(191) NULL;

UPDATE `StrategyPlan`
SET `activeSlotKey` = CASE
  WHEN `status` = 'ARCHIVED' THEN NULL
  WHEN `framework` = 'BSC' THEN CONCAT('BSC:', `companyId`)
  WHEN `framework` = 'OKR' THEN CONCAT('OKR:', `companyId`, ':', `projectId`)
  ELSE NULL
END;

CREATE UNIQUE INDEX `StrategyPlan_activeSlotKey_key` ON `StrategyPlan`(`activeSlotKey`);
