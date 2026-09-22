/** برچسب فارسی بخش‌ها (مطابق مراحل فرم پروفایل شرکت در فرانت) */
export const COMPANY_PROFILE_MODEL_LABELS = {
  COMPANY_BASIC_INFO: "اطلاعات پایه شرکت",
  COMPANY_MANAGER: "مدیران",
  REVENUE_CENTER: "مراکز درآمد",
  COMPANY_SHAREHOLDER: "سهامداران",
  ORGANIZATION_UNIT: "ساختار سازمانی",
  COMPANY_LICENSE_CERTIFICATE: "مجوزها / گواهینامه‌ها",
  COMPANY_MEMBERSHIP: "عضویت‌ها",
  COMPANY_ADMIN_DATA: "اطلاعات تکمیلی ادمین",
  COMPANY_SUPPLIER: "تأمین‌کنندگان کلیدی",
  COMPANY_RAW_MATERIAL: "مواد اولیه / کالاهای اساسی",
  COMPANY_BALANCE_SHEET: "ترازنامه",
  COMPANY_INCOME_STATEMENT: "صورت سود و زیان",
  COMPANY_PRODUCT_SERVICE: "محصولات / خدمات",
  COMPANY_MARKET: "بازار‌ها",
  KEY_CUSTOMER: "مشتریان کلیدی",
  COMPANY_RESOURCE_CAPABILITY: "منابع و قابلیت‌ها",
};

export const COMPANY_PROFILE_FIELDS_BY_MODEL = {
  COMPANY_BASIC_INFO: [
    { value: "brandTitle", label: "نام شرکت" },
    { value: "knownAs", label: "نام/برند شناخته شده شرکت" },
    { value: "nationalId", label: "شناسه / شماره ملی" },
    { value: "isPublicCompany", label: "شرکت بورسی" },
    { value: "isHolding", label: "هلدینگ" },
    { value: "isHoldingSubsidiary", label: "زیرمجموعه هلدینگ" },
    { value: "establishmentYear", label: "سال تاسیس" },
    { value: "commercialActivityStartYear", label: "سال شروع به فعالیت تجاری" },
    { value: "parentCompanyName", label: "نام شرکت مادر" },
    { value: "region", label: "نوع فعالیت منطقه‌ای" },
    { value: "totalPersonnelCount", label: "تعداد کل پرسنل" },
    { value: "operationalPersonnelCount", label: "تعداد پرسنل عملیات" },
    { value: "phoneNumber", label: "شماره تماس" },
    { value: "website", label: "وبسایت" },
    { value: "vision", label: "چشم‌انداز" },
    { value: "objectives", label: "اهداف" },
  ],

  COMPANY_MANAGER: [
    { value: "fullName", label: "نام و نام خانوادگی" },
    { value: "positionTitle", label: "سمت" },
    { value: "isBoardMember", label: "عضو هیئت مدیره" },
    { value: "isStrategyTeamMember", label: "عضو تیم استراتژی" },
    { value: "companyWorkExperience", label: "سابقه کار در شرکت" },
    { value: "totalWorkExperience", label: "سابقه کل" },
    { value: "resumeFileId", label: "فایل رزومه" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  REVENUE_CENTER: [
    { value: "title", label: "نام مرکز درآمد" },
    { value: "activityYearsCount", label: "تعداد سال فعالیت" },
    { value: "totalRevenueSharePercent", label: "سهم از درآمد کل (%)" },
    {
      value: "lastYearEstimatedRevenue",
      label: "برآورد تقریبی درآمد سال گذشته (ریال)",
    },
    { value: "personnelCount", label: "تعداد نفرات" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_SHAREHOLDER: [
    { value: "name", label: "نام سهامدار" },
    { value: "shareholderType", label: "نوع سهامدار" },
    { value: "isBoardMember", label: "عضو هیئت مدیره" },
    { value: "hasPreferredShare", label: "سهام ممتاز" },
    { value: "sharePercent", label: "درصد سهام" },
  ],

  ORGANIZATION_UNIT: [
    { value: "unitName", label: "نام واحد سازمانی" },
    { value: "structureLevel", label: "رده در ساختار" },
    { value: "parentUnitName", label: "واحد سازمانی بالاتر" },
    { value: "isRevenueCenter", label: "مرکز درآمد" },
    { value: "managerName", label: "نام مدیر" },
    { value: "employeeCount", label: "تعداد نفرات" },
    { value: "structureFileId", label: "فایل ساختار سازمانی" },
  ],

  COMPANY_LICENSE_CERTIFICATE: [
    { value: "title", label: "عنوان مجوز/گواهینامه" },
    { value: "issuerReference", label: "مرجع صادرکننده" },
    { value: "issueDate", label: "تاریخ صدور" },
    { value: "type", label: "نوع مجوز" },
    { value: "attachmentFileId", label: "بارگذاری گواهینامه / مجوز" },
  ],

  COMPANY_MEMBERSHIP: [
    { value: "associationName", label: "نام تشکل / انجمن" },
    { value: "membershipDate", label: "تاریخ عضویت" },
    { value: "isBoardMember", label: "عضو هیئت مدیره" },
    { value: "activityScope", label: "حیطه فعالیت انجمن" },
  ],

  COMPANY_PRODUCT_SERVICE: [
    { value: "name", label: "نام محصول / خدمت" },
    { value: "revenueCenter", label: "مرکز درآمد مرتبط" },
    { value: "type", label: "نوع" },
    { value: "revenueSharePercent", label: "سهم از درآمد" },
    { value: "marketPosition", label: "جایگاه در بازار" },
    { value: "startYear", label: "سال شروع به ارائه" },
    { value: "distinctiveFeatures", label: "ویژگی‌های ممتاز" },
    { value: "isExported", label: "صادراتی" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_MARKET: [
    { value: "marketName", label: "نام بازار" },
    { value: "marketType", label: "نوع بازار" },
    { value: "marketSharePercent", label: "سهم از بازار" },
    { value: "marketPenetrationLevel", label: "نفوذ در بازار" },
    { value: "yearsInMarket", label: "تعداد سال حضور در بازار" },
    { value: "relatedProductService", label: "محصول/خدمت مرتبط" },
    { value: "targetMarketType", label: "نوع هدف بازار" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  KEY_CUSTOMER: [
    { value: "customerName", label: "نام مشتری" },
    { value: "category", label: "دسته مشتری" },
    { value: "businessField", label: "زمینه فعالیت" },
    { value: "revenueImpactLevel", label: "اثر در درآمد شرکت" },
    { value: "loyaltyLevel", label: "سطح وفاداری" },
    { value: "walletShareLevel", label: "سهم از جیب مشتری" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_BALANCE_SHEET: [
    { value: "title", label: "عنوان" },
    { value: "year", label: "سال مالی" },
    { value: "balanceSheet", label: "ترازنامه" },
    { value: "balanceFileId", label: "بارگذاری فایل ترازنامه" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_INCOME_STATEMENT: [
    { value: "title", label: "عنوان" },
    { value: "year", label: "سال مالی" },
    { value: "incomeStatement", label: "صورت سود و زیان" },
    { value: "incomeFileId", label: "بارگذاری فایل صورت سود و زیان" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_RESOURCE_CAPABILITY: [
    { value: "capability", label: "قابلیت" },
    { value: "category", label: "دسته" },
    { value: "importanceLevel", label: "درجه اهمیت" },
    { value: "rarityLevel", label: "نادر بودن" },
    { value: "inimitabilityLevel", label: "غیر قابل تقلید بودن" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_SUPPLIER: [
    { value: "supplierName", label: "نام تأمین‌کننده" },
    { value: "productOrService", label: "محصول / خدمت تأمین‌شده" },
    { value: "bargainingPower", label: "قدرت چانه‌زنی" },
    { value: "supplierMarket", label: "بازار تأمین‌کننده" },
    { value: "description", label: "توضیحات" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_RAW_MATERIAL: [
    { value: "materialName", label: "نام ماده اولیه" },
    { value: "category", label: "دسته‌بندی" },
    { value: "costImpactLevel", label: "تاثیر در بهای تمام شده" },
    { value: "purchaseBudgetShare", label: "سهم از بودجه خرید" },
    { value: "description", label: "توضیحات" },
    // { value: "sortOrder", label: "ترتیب نمایش" },
  ],

  COMPANY_ADMIN_DATA: [
    { value: "financeInformation", label: "اطلاعات مالی شرکت" },
    { value: "externalInformation", label: "اطلاعات پروفایل محیطی" },
    { value: "internalInformation", label: "اطلاعات پروفایل داخلی" },
    { value: "companyProfile", label: "اطلاعات تکمیلی شرکت" },
  ],
};

const buildProfileFieldOptionLabel = (model, fieldLabel) => {
  const section = COMPANY_PROFILE_MODEL_LABELS[model] ?? model;
  return `${section} — ${fieldLabel}`;
};

/** گزینه‌های Select در AdminJS (AnalysisFormProfileField / MultiAnalysisFormProfileField) */
export const COMPANY_PROFILE_FIELD_OPTIONS = Object.entries(
  COMPANY_PROFILE_FIELDS_BY_MODEL,
).flatMap(([model, fields]) =>
  fields.map((field) => ({
    value: `${model}.${field.value}`,
    label: buildProfileFieldOptionLabel(model, field.label),
  })),
);

/** نمایش خوانا در لیست/نمایش ادمین */
export const getCompanyProfileFieldKeyLabel = (profileFieldKey) => {
  const option = COMPANY_PROFILE_FIELD_OPTIONS.find(
    (item) => item.value === profileFieldKey,
  );
  return option?.label ?? profileFieldKey;
};
