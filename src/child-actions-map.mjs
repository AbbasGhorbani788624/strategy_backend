import { buildCompanyChildActions } from "./actions.mjs";
import {
  companyBasicInfoFields,
  companyManagerFields,
  revenueCenterFields,
  companyShareholderFields,
  organizationUnitFields,
  companyLicenseCertificateFields,
  companyMembershipFields,
  companyProductServiceFields,
  companyMarketFields,
  keyCustomerFields,
  companyBalanceSheetFields,
  companyIncomeStatementFields,
  companyResourceCapabilityFields,
} from "./company-child-fields.mjs";

export const companyBasicInfoActions = buildCompanyChildActions(
  "companyBasicInfo",
  companyBasicInfoFields,
  true,
);

export const companyManagerActions = buildCompanyChildActions(
  "companyManager",
  companyManagerFields,
  false,
);

export const revenueCenterActions = buildCompanyChildActions(
  "revenueCenter",
  revenueCenterFields,
  false,
);

export const companyShareholderActions = buildCompanyChildActions(
  "companyShareholder",
  companyShareholderFields,
  false,
);

export const organizationUnitActions = buildCompanyChildActions(
  "organizationUnit",
  organizationUnitFields,
  false,
);

export const companyLicenseCertificateActions = buildCompanyChildActions(
  "companyLicenseCertificate",
  companyLicenseCertificateFields,
  false,
);

export const companyMembershipActions = buildCompanyChildActions(
  "companyMembership",
  companyMembershipFields,
  false,
);

export const companyProductServiceActions = buildCompanyChildActions(
  "companyProductService",
  companyProductServiceFields,
  false,
);

export const companyMarketActions = buildCompanyChildActions(
  "companyMarket",
  companyMarketFields,
  false,
);

export const keyCustomerActions = buildCompanyChildActions(
  "keyCustomer",
  keyCustomerFields,
  false,
);

export const companyBalanceSheetActions = buildCompanyChildActions(
  "companyBalanceSheet",
  companyBalanceSheetFields,
  false,
);

export const companyIncomeStatementActions = buildCompanyChildActions(
  "companyIncomeStatement",
  companyIncomeStatementFields,
  false,
);

export const companyResourceCapabilityActions = buildCompanyChildActions(
  "companyResourceCapability",
  companyResourceCapabilityFields,
  false,
);
