-- Rename the intermediate analysis input columns to the final field names.
ALTER TABLE `CompanyBalanceSheet`
  CHANGE `balanceSheetAnalysisInput` `balanceSheet` TEXT NULL;

ALTER TABLE `CompanyIncomeStatement`
  CHANGE `incomeStatementAnalysisInput` `incomeStatement` TEXT NULL;

UPDATE `AnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_BALANCE_SHEET.balanceSheet'
WHERE `profileFieldKey` = 'COMPANY_BALANCE_SHEET.balanceSheetAnalysisInput';

UPDATE `AnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.incomeStatement'
WHERE `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.incomeStatementAnalysisInput';

UPDATE `MultiAnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_BALANCE_SHEET.balanceSheet'
WHERE `profileFieldKey` = 'COMPANY_BALANCE_SHEET.balanceSheetAnalysisInput';

UPDATE `MultiAnalysisFormProfileField`
SET `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.incomeStatement'
WHERE `profileFieldKey` = 'COMPANY_INCOME_STATEMENT.incomeStatementAnalysisInput';
