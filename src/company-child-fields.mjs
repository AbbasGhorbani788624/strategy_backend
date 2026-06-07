export const companyBasicInfoFields = {
  brandTitle: "string",
  nationalId: "string",
  companyType: "string",
  establishmentYear: "string",
  commercialActivityStartYear: "string",
  isListed: "boolean",
  isHolding: "boolean",
  isHoldingSubsidiary: "boolean",
  parentCompanyName: "string",
  totalPersonnelCount: "int",
  operationalPersonnelCount: "int",
  phoneNumber: "string",
  website: "string",
};

export const companyManagerFields = {
  fullName: "string",
  positionTitle: "string",
  isBoardMember: "boolean",
  isStrategyTeamMember: "boolean",
  companyWorkExperience: "int",
  totalWorkExperience: "int",
  resumeFileId: "string",
  sortOrder: "int",
};

export const revenueCenterFields = {
  title: "string",
  activityYearsCount: "int",
  totalRevenueSharePercent: "decimal",
  personnelCount: "int",
  sortOrder: "int",
};

export const companyShareholderFields = {
  name: "string",
  shareholderType: "string",
  isBoardMember: "boolean",
  hasPreferredShare: "boolean",
  sharePercent: "decimal",
};

export const organizationUnitFields = {
  unitName: "string",
  structureLevel: "string",
  isRevenueCenter: "boolean",
  parentUnitName: "string",
  managerName: "string",
  employeeCount: "int",
  structureFileId: "string",
};

export const companyLicenseCertificateFields = {
  title: "string",
  issuerReference: "string",
  issueDate: "date",
  type: "string",
};

export const companyMembershipFields = {
  associationName: "string",
  membershipDate: "date",
  isBoardMember: "boolean",
};

export const companyProductServiceFields = {
  name: "string",
  revenueCenter: "string",
  type: "string",
  revenueSharePercent: "string",
  distinctiveFeatures: "string",
  startYear: "int",
  marketPosition: "string",
  isExported: "boolean",
  sortOrder: "int",
};

export const companyMarketFields = {
  marketName: "string",
  marketType: "string",
  marketSharePercent: "decimal",
  marketPenetrationLevel: "string",
  yearsInMarket: "int",
  relatedProductService: "string",
  sortOrder: "int",
};

export const keyCustomerFields = {
  customerName: "string",
  category: "string",
  businessField: "string",
  productImportanceLevel: "string",
  revenueImpactLevel: "string",
  loyaltyLevel: "string",
  walletShareLevel: "string",
  sortOrder: "int",
};

export const companyBalanceSheetFields = {
  fiscalPeriodStart: "date",
  fiscalPeriodEnd: "date",
  category: "string",
  title: "string",
  amount: "decimal",
  balanceFileId: "string",
  description: "string",
  sortOrder: "int",
};

export const companyIncomeStatementFields = {
  fiscalPeriodStart: "date",
  fiscalPeriodEnd: "date",
  category: "string",
  title: "string",
  amount: "decimal",
  incomeFileId: "string",
  description: "string",
  sortOrder: "int",
};

export const companyResourceCapabilityFields = {
  capability: "string",
  category: "string",
  importanceLevel: "string",
  availabilityLevel: "string",
  rarityLevel: "string",
  inimitabilityLevel: "string",
  sortOrder: "int",
};
