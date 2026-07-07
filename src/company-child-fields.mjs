export const companyBasicInfoFields = {
  brandTitle: "string",
  knownAs: "knownAs",
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
  lastYearEstimatedRevenue: "decimal",
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
  activityScope: "string",
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
  relatedProductService: "json",
  targetMarketType: "string",
  sortOrder: "int",
};

export const keyCustomerFields = {
  customerName: "string",
  category: "string",
  businessField: "string",
  revenueImpactLevel: "string",
  loyaltyLevel: "string",
  walletShareLevel: "string",
  sortOrder: "int",
};

export const companyBalanceSheetFields = {
  year: "int",
  title: "string",
  balanceFileId: "string",
  description: "string",
  sortOrder: "int",
};

export const companyIncomeStatementFields = {
  year: "int",
  title: "string",
  incomeFileId: "string",
  description: "string",
  sortOrder: "int",
};

export const companyResourceCapabilityFields = {
  capability: "string",
  category: "string",
  importanceLevel: "string",
  rarityLevel: "string",
  inimitabilityLevel: "string",
  sortOrder: "int",
};

export const userInfoFields = {
  firstName: "string",
  lastName: "string",
  nationalCode: "string",
  jobTitle: "string",
  birthDate: "date",
  lastJobTitle: "string",
  organizationalLevel: "string",
  isboardMember: "boolean",
  isshareholder: "boolean",
  isstrategyTeamMember: "boolean",
};

export const userEducationFields = {
  degree: "string",
  fieldOfStudy: "string",
  specialization: "string",
  graduationYear: "int",
  university: "string",
  sortOrder: "int",
};

export const userTrainingCourseFields = {
  courseName: "string",
  level: "string",
  hours: "int",
  provider: "string",
  date: "date",
  sortOrder: "int",
};

export const userCompetencyFields = {
  competencyName: "string",
  type: "string",
  expectedLevel: "string",
  currentLevel: "string",
  yearsOfExperience: "int",
  jobRelevance: "string",
  importance: "string",
  sortOrder: "int",
};

export const companySupplierFields = {
  supplierName: "string",
  productOrService: "string",
  bargainingPower: "string",
  supplierMarket: "string",
  description: "string",
  sortOrder: "int",
};

export const companyRawMaterialFields = {
  materialName: "string",
  costImpactLevel: "string",
  purchaseBudgetShare: "string",
  category: "string",
  description: "string",
  sortOrder: "int",
};
