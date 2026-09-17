-- AlterTable
ALTER TABLE `CompanyBalanceSheet` CHANGE `description` `balanceSheetAnalysisInput` TEXT NULL;

-- AlterTable
ALTER TABLE `CompanyIncomeStatement` CHANGE `description` `incomeStatementAnalysisInput` TEXT NULL;

-- Update existing analysis form profile field keys
UPDATE `AnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_BALANCE_SHEET.balanceSheetAnalysisInput'
WHERE `profileFieldKey` = 'COMPANY_BALANCE_SHEET.description';

UPDATE `AnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.incomeStatementAnalysisInput'
WHERE `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.description';

UPDATE `MultiAnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_BALANCE_SHEET.balanceSheetAnalysisInput'
WHERE `profileFieldKey` = 'COMPANY_BALANCE_SHEET.description';

UPDATE `MultiAnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.incomeStatementAnalysisInput'
WHERE `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.description';
