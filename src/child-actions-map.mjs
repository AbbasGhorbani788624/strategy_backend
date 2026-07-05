//child-actions-map
import { buildCompanyChildActions, buildUserChildActions } from "./actions.mjs";
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
  userInfoFields,
  userEducationFields,
  userTrainingCourseFields,
  userCompetencyFields,
  companySupplierFields,
  companyRawMaterialFields,
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

export const userInfoActions = buildUserChildActions(
  "userInfo",
  userInfoFields,
  true,
);

export const userEducationActions = buildUserChildActions(
  "userEducation",
  userEducationFields,
);

export const userTrainingCourseActions = buildUserChildActions(
  "userTrainingCourse",
  userTrainingCourseFields,
);

export const userCompetencyActions = buildUserChildActions(
  "userCompetency",
  userCompetencyFields,
);

export const companySupplierActions = buildCompanyChildActions(
  "companySupplier",
  companySupplierFields,
  false,
);

export const companyRawMaterialActions = buildCompanyChildActions(
  "companyRawMaterial",
  companyRawMaterialFields,
  false,
);
