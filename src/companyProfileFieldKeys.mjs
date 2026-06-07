export const COMPANY_PROFILE_FIELDS_BY_MODEL = {
  COMPANY_BASIC_INFO: [
    { value: "brandTitle", label: "عنوان برند" },
    { value: "nationalId", label: "شناسه ملی" },
    { value: "companyType", label: "نوع شرکت" },
    { value: "establishmentYear", label: "سال تاسیس" },
    { value: "commercialActivityStartYear", label: "سال شروع فعالیت تجاری" },
    { value: "isListed", label: "بورسی بودن" },
    { value: "isHolding", label: "هولدینگ بودن" },
    { value: "isHoldingSubsidiary", label: "زیرمجموعه هولدینگ بودن" },
    { value: "parentCompanyName", label: "نام شرکت مادر" },
    { value: "totalPersonnelCount", label: "تعداد کل پرسنل" },
    { value: "operationalPersonnelCount", label: "تعداد پرسنل عملیاتی" },
    { value: "phoneNumber", label: "شماره تماس" },
    { value: "website", label: "وبسایت" },
  ],

  COMPANY_MANAGER: [
    { value: "fullName", label: "نام کامل" },
    { value: "positionTitle", label: "عنوان سمت" },
    { value: "isBoardMember", label: "عضو هیئت مدیره" },
    { value: "isStrategyTeamMember", label: "عضو تیم استراتژی" },
    { value: "companyWorkExperience", label: "سابقه کار در شرکت" },
    { value: "totalWorkExperience", label: "کل سابقه کاری" },
    { value: "resumeFileId", label: "شناسه فایل رزومه" },
  ],

  REVENUE_CENTER: [
    { value: "title", label: "عنوان" },
    { value: "activityYearsCount", label: "تعداد سال‌های فعالیت" },
    { value: "totalRevenueSharePercent", label: "درصد سهم از کل درآمد" },
    { value: "personnelCount", label: "تعداد پرسنل" },
  ],

  COMPANY_SHAREHOLDER: [
    { value: "name", label: "نام" },
    { value: "shareholderType", label: "نوع سهامدار" },
    { value: "isBoardMember", label: "عضو هیئت مدیره" },
    { value: "hasPreferredShare", label: "دارای سهام ممتاز" },
    { value: "sharePercent", label: "درصد سهم" },
  ],

  ORGANIZATION_UNIT: [
    { value: "unitName", label: "نام واحد" },
    { value: "structureLevel", label: "سطح ساختار" },
    { value: "isRevenueCenter", label: "مرکز درآمد بودن" },
    { value: "parentUnitName", label: "نام واحد والد" },
    { value: "managerName", label: "نام مدیر" },
    { value: "employeeCount", label: "تعداد کارکنان" },
    { value: "structureFileId", label: "شناسه فایل ساختار" },
  ],

  COMPANY_LICENSE_CERTIFICATE: [
    { value: "title", label: "عنوان" },
    { value: "issuerReference", label: "مرجع صادرکننده" },
    { value: "issueDate", label: "تاریخ صدور" },
    { value: "type", label: "نوع" },
    { value: "attachmentFileId", label: "شناسه فایل پیوست" },
  ],

  COMPANY_MEMBERSHIP: [
    { value: "associationName", label: "نام انجمن / عضویت" },
    { value: "membershipDate", label: "تاریخ عضویت" },
    { value: "isBoardMember", label: "عضو هیئت مدیره" },
  ],

  COMPANY_PRODUCT_SERVICE: [
    { value: "name", label: "نام" },
    { value: "revenueCenter", label: "مرکز درآمد" },
    { value: "type", label: "نوع" },
    { value: "revenueSharePercent", label: "درصد سهم درآمد" },
    { value: "distinctiveFeatures", label: "ویژگی‌های متمایز" },
    { value: "startYear", label: "سال شروع" },
    { value: "marketPosition", label: "جایگاه بازار" },
    { value: "isExported", label: "صادراتی بودن" },
  ],

  COMPANY_MARKET: [
    { value: "marketName", label: "نام بازار" },
    { value: "marketType", label: "نوع بازار" },
    { value: "marketSharePercent", label: "درصد سهم بازار" },
    { value: "marketPenetrationLevel", label: "سطح نفوذ در بازار" },
    { value: "yearsInMarket", label: "سال‌های حضور در بازار" },
    { value: "relatedProductService", label: "محصول / خدمت مرتبط" },
  ],

  KEY_CUSTOMER: [
    { value: "customerName", label: "نام مشتری" },
    { value: "category", label: "دسته‌بندی" },
    { value: "businessField", label: "حوزه کسب‌وکار" },
    { value: "productImportanceLevel", label: "سطح اهمیت محصول" },
    { value: "revenueImpactLevel", label: "سطح اثرگذاری بر درآمد" },
    { value: "loyaltyLevel", label: "سطح وفاداری" },
    { value: "walletShareLevel", label: "سهم از کیف پول مشتری" },
  ],

  COMPANY_BALANCE_SHEET: [
    { value: "fiscalPeriodStart", label: "شروع دوره مالی" },
    { value: "fiscalPeriodEnd", label: "پایان دوره مالی" },
    { value: "category", label: "دسته‌بندی" },
    { value: "title", label: "عنوان" },
    { value: "amount", label: "مبلغ" },
    { value: "balanceFileId", label: "شناسه فایل ترازنامه" },
    { value: "description", label: "توضیحات" },
  ],

  COMPANY_INCOME_STATEMENT: [
    { value: "fiscalPeriodStart", label: "شروع دوره مالی" },
    { value: "fiscalPeriodEnd", label: "پایان دوره مالی" },
    { value: "category", label: "دسته‌بندی" },
    { value: "title", label: "عنوان" },
    { value: "amount", label: "مبلغ" },
    { value: "incomeFileId", label: "شناسه فایل صورت سود و زیان" },
    { value: "description", label: "توضیحات" },
  ],

  COMPANY_RESOURCE_CAPABILITY: [
    { value: "capability", label: "قابلیت" },
    { value: "category", label: "دسته‌بندی" },
    { value: "importanceLevel", label: "سطح اهمیت" },
    { value: "availabilityLevel", label: "سطح دسترس‌پذیری" },
    { value: "rarityLevel", label: "سطح کمیابی" },
    { value: "inimitabilityLevel", label: "سطح تقلیدناپذیری" },
  ],
};

export const COMPANY_PROFILE_FIELD_OPTIONS = Object.entries(
  COMPANY_PROFILE_FIELDS_BY_MODEL,
).flatMap(([model, fields]) =>
  fields.map((field) => ({
    value: `${model}.${field.value}`,
    label: `${model} / ${field.label}`,
  })),
);
