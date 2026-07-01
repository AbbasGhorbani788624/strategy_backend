const booleanFields = {
  basicInfo: ["isListed", "isHolding", "isHoldingSubsidiary"],

  managers: ["isBoardMember", "isStrategyTeamMember"],

  shareholders: ["isBoardMember", "hasPreferredShare"],

  organizationUnits: ["isRevenueCenter"],

  memberships: ["isBoardMember"],

  productServices: ["isExported"],
};

const numberFields = {
  basicInfo: ["totalPersonnelCount", "operationalPersonnelCount"],

  managers: ["companyWorkExperience", "totalWorkExperience", "sortOrder"],

  revenueCenters: ["activityYearsCount", "personnelCount", "sortOrder"],

  productServices: ["startYear", "sortOrder"],

  markets: ["yearsInMarket", "sortOrder"],

  keyCustomers: ["sortOrder"],

  balanceSheets: ["sortOrder"],

  incomeStatements: ["sortOrder"],

  organizationUnits: ["employeeCount"],

  resourceCapabilities: ["sortOrder"],
};

const decimalFields = {
  revenueCenters: ["totalRevenueSharePercent"],

  shareholders: ["sharePercent"],

  markets: ["marketSharePercent"],

  balanceSheets: ["amount"],

  incomeStatements: ["amount"],
};

const dateFields = {
  licenseCertificates: ["issueDate"],

  memberships: ["membershipDate"],

  balanceSheets: ["fiscalPeriodStart", "fiscalPeriodEnd"],

  incomeStatements: ["fiscalPeriodStart", "fiscalPeriodEnd"],
};

function normalizeBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  if (value === true || value === false) {
    return value;
  }

  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  return Number(value);
}

function normalizeDecimal(value) {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  return Number(value);
}

function normalizeDate(value) {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  return new Date(value);
}

function normalizeFormData(section, data) {
  const result = { ...data };

  (booleanFields[section] || []).forEach((field) => {
    if (field in result) {
      result[field] = normalizeBoolean(result[field]);
    }
  });

  (numberFields[section] || []).forEach((field) => {
    if (field in result) {
      result[field] = normalizeNumber(result[field]);
    }
  });

  (decimalFields[section] || []).forEach((field) => {
    if (field in result) {
      result[field] = normalizeDecimal(result[field]);
    }
  });

  (dateFields[section] || []).forEach((field) => {
    if (field in result) {
      result[field] = normalizeDate(result[field]);
    }
  });

  return result;
}

module.exports = normalizeFormData;
