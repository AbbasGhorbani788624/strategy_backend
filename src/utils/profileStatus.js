// utils/profileStatus.js

const PROFILE_RELATIONS = {
  COMPANY_BASIC_INFO: "basicInfo",
  COMPANY_MANAGER: "managers",
  REVENUE_CENTER: "revenueCenters",
  COMPANY_SHAREHOLDER: "shareholders",
  ORGANIZATION_UNIT: "organizationUnits",
  COMPANY_LICENSE_CERTIFICATE: "licenseCertificates",
  COMPANY_MEMBERSHIP: "memberships",
  COMPANY_PRODUCT_SERVICE: "productServices",
  COMPANY_MARKET: "markets",
  KEY_CUSTOMER: "keyCustomers",
  COMPANY_BALANCE_SHEET: "balanceSheets",
  COMPANY_INCOME_STATEMENT: "incomeStatements",
  COMPANY_RESOURCE_CAPABILITY: "resourceCapabilities",
  COMPANY_SUPPLIER: "keySuppliers",
  COMPANY_RAW_MATERIAL: "rawMaterials",
  COMPANY_ADMIN_DATA: "companyAdminData",
};

const MODEL_TITLES = {
  COMPANY_BASIC_INFO: "اطلاعات پایه شرکت",
  COMPANY_MANAGER: "مدیران شرکت",
  REVENUE_CENTER: "مراکز درآمد",
  COMPANY_SHAREHOLDER: "سهامداران",
  ORGANIZATION_UNIT: "چارت سازمانی",
  COMPANY_LICENSE_CERTIFICATE: "مجوزها و گواهینامه‌ها",
  COMPANY_MEMBERSHIP: "عضویت‌ها",
  COMPANY_PRODUCT_SERVICE: "محصولات و خدمات",
  COMPANY_MARKET: "بازارها",
  KEY_CUSTOMER: "مشتریان کلیدی",
  COMPANY_BALANCE_SHEET: "ترازنامه",
  COMPANY_INCOME_STATEMENT: "صورت سود و زیان",
  COMPANY_RESOURCE_CAPABILITY: "منابع و قابلیت‌ها",
  COMPANY_SUPPLIER: "تأمین‌کنندگان کلیدی",
  COMPANY_RAW_MATERIAL: "مواد اولیه / کالاهای اساسی",
  COMPANY_ADMIN_DATA: "اطلاعات تکمیلی ادمین",
};

const COMPANY_PROFILE_INCLUDE = {
  basicInfo: true,
  managers: true,
  revenueCenters: true,
  shareholders: true,
  organizationUnits: true,
  licenseCertificates: true,
  memberships: true,
  productServices: true,
  markets: true,
  keyCustomers: true,
  balanceSheets: true,
  incomeStatements: true,
  resourceCapabilities: true,
  keySuppliers: true,
  rawMaterials: true,
  companyAdminData: true,
};

const isFilled = (value) => {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  return true;
};

const isProfileFieldCompleted = (company, profileFieldKey) => {
  const [entity, field] = profileFieldKey.split(".");

  if (entity === "COMPANY_ADMIN_DATA") {
    const rawData = company?.companyAdminData?.data;

    if (!rawData || typeof rawData !== "object") {
      return false;
    }

    const legacyText =
      typeof rawData.text === "string" ? rawData.text : undefined;
    const value =
      rawData[field] ??
      (field === "internalInformation" ? legacyText : undefined);

    return isFilled(value);
  }

  const relation = PROFILE_RELATIONS[entity];

  if (!relation) return false;

  const value = company?.[relation];

  if (!value) return false;

  // One To One
  if (!Array.isArray(value)) {
    return isFilled(value[field]);
  }

  // One To Many
  return value.some((item) => isFilled(item[field]));
};

const buildProfileStatus = (company, profileFields = []) => {
  const missingModels = new Map();

  for (const field of profileFields) {
    if (!isProfileFieldCompleted(company, field.profileFieldKey)) {
      const [model] = field.profileFieldKey.split(".");

      if (!missingModels.has(model)) {
        missingModels.set(model, {
          key: model,
          title: MODEL_TITLES[model] || model,
        });
      }
    }
  }

  return {
    disabled: missingModels.size > 0,
    missingModels: [...missingModels.values()],
  };
};

module.exports = {
  COMPANY_PROFILE_INCLUDE,
  PROFILE_RELATIONS,
  MODEL_TITLES,
  isProfileFieldCompleted,
  buildProfileStatus,
};
