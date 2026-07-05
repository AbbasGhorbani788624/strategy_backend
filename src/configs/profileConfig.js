//profile config
const ORGANIZATIONAL_LEVELS = [
  { value: "CEO", label: "مدیرعامل" },
  { value: "SENIOR_MANAGER", label: "مدیر ارشد" },
  { value: "MIDDLE_MANAGER", label: "مدیر میانی" },
  { value: "EXPERT", label: "کارشناس" },
  { value: "EMPLOYEE", label: "کارمند" },
  { value: "OTHER", label: "سایر" },
];

const SHAREHOLDER_TYPES = [
  { value: "boardMember", label: "عضو هیات مدیره" },
  { value: "shareholder", label: "سهامدار" },
  { value: "strategyTeamMember", label: "عضو تیم استراتژی" },
];

const DEGREE_TYPES = [
  { value: "DIPLOMA", label: "دیپلم" },
  { value: "ASSOCIATE_DEGREE", label: "کاردانی" },
  { value: "BACHELOR_DEGREE", label: "کارشناسی" },
  { value: "MASTER_DEGREE", label: "کارشناسی ارشد" },
  { value: "PHD", label: "دکتری" },
  { value: "POST_DOCTORATE", label: "پس‌ دکتری" },
  { value: "DBA", label: "DBA" },
  { value: "NBA", label: "NBA" },
];

const COURSE_LEVELS = [
  { value: "BEGINNER", label: "مقدماتی" },
  { value: "INTERMEDIATE", label: "متوسط" },
  { value: "ADVANCED", label: "پیشرفته" },
  { value: "SPECIALIZED", label: "تخصصی" },
];

const CURRENT_LEVELS = [
  { value: "FAMILIAR", label: "آشنایی" },
  { value: "NORMAL", label: "معمولی" },
  { value: "PROFESSIONAL", label: "حرفه‌ای" },
  { value: "EXPERT", label: "خبرگی" },
];

const EXPECTED_LEVELS = [
  { value: "FAMILIAR", label: "آشنایی" },
  { value: "NORMAL", label: "معمولی" },
  { value: "PROFESSIONAL", label: "حرفه‌ای" },
  { value: "EXPERT", label: "خبرگی" },
];

const IMPORTANCE_LEVELS = [
  { value: "LOW", label: "کم" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "زیاد" },
  { value: "CRITICAL", label: "حیاتی" },
];

const SKILL_TYPES = [
  { value: "TECHNICAL_SKILL", label: "فنی و تخصصی" },
  { value: "SOFT_SKILL", label: "مهارت‌های نرم" },
  { value: "FOREIGN_LANGUAGE", label: "زبان خارجی" },
  { value: "MANAGERIAL_SKILL", label: "مدیریتی" },
  { value: "METACOGNITIVE_SKILL", label: "مهارتی" },
];

const JOB_RELEVANCE = [
  { value: "NOT_RELATED", label: "کاملاً نامرتبط" },
  { value: "PARTIALLY_RELATED", label: "تاحدودی مرتبط" },
  { value: "RELATED", label: "مرتبط" },
  { value: "HIGHLY_IMPACTFUL", label: "بسیار اثرگذار" },
];

/////////////

const ACTIVITY_SCOPE = [
  { value: "IRAN", label: " ایران" },
  { value: "INTERNATIONAL", label: "بین‌المللی" },
];

const COMPANY_TYPES = [
  { value: "PUBLIC_COMPANY", label: "شرکت بورسی" },
  { value: "HOLDING", label: "هلدینگ" },
  { value: "HOLDING_SUBSIDIARY", label: "زیرمجموعه هلدینگ" },
];

const MANAGER_ROLES = [
  { value: "BOARD_MEMBER", label: "عضو هیأت مدیره" },
  { value: "STRATEGY_TEAM_MEMBER", label: "عضو تیم استراتژی" },
];

const SHAREHOLDER_TYPES_COMPANY = [
  { value: "LEGAL", label: "حقوقی" },
  { value: "NATURAL", label: "حقیقی" },
];

const SHAREHOLDER_BOARD_MEMBERSHIP = [
  { value: "isBoardMember", label: "عضو هیأت مدیره" },
  { value: "isPreferredShare", label: "سهام ممتاز" },
];

const ORG_STRUCTURE_LEVELS = [
  { value: "TOP", label: "تاپ چارت" },
  { value: "MIDDLE", label: "میانی" },
];

const ORG_UNIT_TYPES = [{ value: "REVENUE_CENTER", label: "مرکز درآمد" }];

const PARENT_UNITS = [
  { value: "EXECUTIVE_BOARD", label: "هیات مدیره / مدیریت ارشد" },
  { value: "GENERAL_MGMT", label: "مدیریت عمومی" },
  { value: "HR_DEPT", label: "مدیریت منابع انسانی" },
  { value: "FINANCE_DEPT", label: "مدیریت مالی و حسابداری" },
  { value: "TECH_DEPT", label: "مدیریت فناوری اطلاعات" },
  { value: "MARKETING_DEPT", label: "مدیریت بازاریابی و فروش" },
  { value: "OPERATIONS_DEPT", label: "مدیریت عملیات" },
  { value: "LEGAL_DEPT", label: "واحد حقوقی" },
  { value: "STRATEGY_DEPT", label: "واحد استراتژی" },
];

const revenueCenters = [
  { value: "sales", label: "فروش مستقیم" },
  { value: "subscription", label: "اشتراک ماهانه/سالانه" },
  { value: "services", label: "ارائه خدمات و مشاوره" },
  { value: "licensing", label: "فروش لایسنس و مجوز" },
  { value: "advertising", label: "تبلیغات و اسپانسرینگ" },
];

const types = [
  { value: "product", label: "محصول فیزیکی" },
  { value: "digital_product", label: "محصول دیجیتال" },
  { value: "service", label: "خدمت" },
  { value: "saas", label: "سرویس تحت وب (SaaS)" },
  { value: "hybrid", label: "ترکیبی (محصول + خدمت)" },
];

const marketPositions = [
  { value: "leader", label: "پیشرو بازار (Market Leader)" },
  { value: "challenger", label: "چالشگر (Challenger)" },
  { value: "niche", label: "نیچ مارکت / گوشه بازار (Niche Player)" },
  { value: "follower", label: "پیرو بازار (Follower)" },
];

const revenueShares = [
  { value: "low", label: "کمتر از ۱۰٪" },
  { value: "medium_low", label: "۱۰٪ تا ۳۰٪" },
  { value: "medium_high", label: "۳۰٪ تا ۶۰٪" },
  { value: "high", label: "بیش از ۶۰٪" },
  { value: "primary", label: "منبع اصلی درآمد" },
];

const marketTypes = [
  { value: "local", label: "بازار محلی" },
  { value: "national", label: "بازار ملی" },
  { value: "regional", label: "بازار منطقه‌ای" },
  { value: "global", label: "بازار جهانی" },
  { value: "niche", label: "بازار گوشه‌ای (Niche)" },
];

const marketPenetration = [
  { value: "targeted", label: "تنها هدف‌گذاری شده" },
  { value: "new_entry", label: "ورود تازه (شروع فعالیت)" },
  { value: "low", label: "نفوذ کم (شروع کار)" },
  { value: "medium", label: "نفوذ متوسط (رشد پایدار)" },
  { value: "high", label: "نفوذ بالا (اشباع نسبی)" },
  { value: "dominant", label: "نفوذ غالب (تسلط بر بازار)" },
];

const customerCategories = [
  { value: "b2c", label: "مصرف‌کننده نهایی (B2C)" },
  { value: "b2b_enterprise", label: "سازمانی بزرگ (Enterprise B2B)" },
  { value: "b2b_smb", label: "سازمانی کوچک و متوسط (SMB B2B)" },
  { value: "government", label: "دولتی و نیمه‌دولتی" },
  { value: "reseller", label: "بازاریاب / نماینده فروش" },
  { value: "partner", label: "شریک تجاری استراتژیک" },
  { value: "distribution_channel", label: "کانال توزیع" },
];

const productImportance = [
  { value: "critical", label: "حیاتی (Must-have)" },
  { value: "high", label: "بسیار مهم (High Priority)" },
  { value: "medium", label: "مهم (Important)" },
  { value: "low", label: "کم‌اهمیت (Nice-to-have)" },
  { value: "optional", label: "اختیاری (Optional)" },
];

const revenueImpact = [
  { value: "strategic", label: "استراتژیک (تأثیر کلیدی در رشد)" },
  { value: "major", label: "عمده (بخش قابل توجهی از درآمد)" },
  { value: "significant", label: "قابل توجه" },
  { value: "moderate", label: "متوسط" },
  { value: "minor", label: "جزئی / ناچیز" },
];

const loyaltyLevels = [
  { value: "champion", label: "قهرمان (وفادارترین مشتریان)" },
  { value: "loyal", label: "وفادار" },
  { value: "neutral", label: "خنثی / ریسک ترک بالا" },
  { value: "at_risk", label: "در معرض خطر (احتمال ترک)" },
  { value: "lost", label: "از دست رفته" },
];

const shareOfWallet = [
  { value: "exclusive", label: "انحصاری (۱۰۰٪ نیاز توسط ما تأمین می‌شود)" },
  { value: "dominant", label: "غالب (بیش از ۷۰٪)" },
  { value: "majority", label: "اکثریت (۵۰٪ تا ۷۰٪)" },
  { value: "competitive", label: "رقابتی (۲۰٪ تا ۵۰٪)" },
  { value: "minor", label: "ناچیز (کمتر از ۲۰٪)" },
];

const categoryOptions = [
  { value: "raw_material", label: "مواد اولیه" },
  { value: "technology", label: "فناوری و دانش" },
  { value: "human_resource", label: "نیروی انسانی و تخصص" },
  { value: "brand_reputation", label: "برند و شهرت" },
  { value: "infrastructure", label: "زیرساخت و تجهیزات" },
  { value: "management_systems", label: "نظام‌های مدیریتی" },
  { value: "other", label: "سایر" },
];

const accessLevelOptions = [
  { value: "exclusive", label: "انحصاری (۱۰۰٪ نیاز توسط ما تأمین می‌شود)" },
  { value: "dominant", label: "غالب (بیش از ۷۰٪)" },
  { value: "majority", label: "اکثریت (۵۰٪ تا ۷۰٪)" },
  { value: "competitive", label: "رقابتی (۲۰٪ تا ۵۰٪)" },
  { value: "minor", label: "ناچیز (کمتر از ۲۰٪)" },
];

const rarityOptions = [
  { value: "common", label: "عمومی (رایج)" },
  { value: "uncommon", label: "غیرمعمول" },
  { value: "rare", label: "نادر" },
  { value: "very_rare", label: "بسیار نادر" },
  { value: "legendary", label: "افسانه‌ای/منحصربه‌فرد" },
];

const imitabilityOptions = [
  { value: "easily_imitated", label: "به راحتی قابل تقلید" },
  { value: "difficult", label: "دشوار برای تقلید" },
  { value: "costly_to_imitate", label: "با هزینه بسیار بالا برای تقلید" },
  { value: "impossible", label: "غیرقابل تقلید" },
];

const COMPANY_STRUCTURE_TYPES = [
  { value: "PUBLIC", label: "شرکت بورسی" },
  { value: "HOLDING", label: "هلدینگ" },
  { value: "SUBSIDIARY", label: "زیرمجموعه هلدینگ" },
];

//قدرت چانه زنی

const BARGAINING_POWER = [
  { value: "LOW", label: "کم" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "زیاد" },
  { value: "VERY_HIGH", label: "بسیار زیاد" },
];

const COST_IMPACT_LEVELS = [
  { value: "LESS_THAN_5", label: "کمتر از ۵ درصد" },
  { value: "BETWEEN_5_AND_10", label: "بین ۵ تا ۱۰ درصد" },
  { value: "BETWEEN_10_AND_30", label: "بین ۱۰ تا ۳۰ درصد" },
  { value: "MORE_THAN_30", label: "بیشتر از ۳۰ درصد" },
];

const PURCHASE_BUDGET_SHARES = [
  { value: "LESS_THAN_1", label: "کمتر از ۱ درصد" },
  { value: "BETWEEN_1_AND_5", label: "بین ۱ تا ۵ درصد" },
  { value: "BETWEEN_5_AND_20", label: "بین ۵ تا ۲۰ درصد" },
  { value: "BETWEEN_20_AND_60", label: "بین ۲۰ تا ۶۰ درصد" },
  { value: "MORE_THAN_60", label: "بیشتر از ۶۰ درصد" },
];

const PROCUREMENT_CATEGORIES = [
  { value: "STRATEGIC", label: "استراتژیک" },
  { value: "LEVERAGE", label: "اهرمی" },
  { value: "BOTTLENECK", label: "گلوگاهی" },
  { value: "ROUTINE", label: "روتین" },
];

module.exports = {
  SHAREHOLDER_TYPES,
  ORGANIZATIONAL_LEVELS,
  DEGREE_TYPES,
  COURSE_LEVELS,
  EXPECTED_LEVELS,
  CURRENT_LEVELS,
  JOB_RELEVANCE,
  IMPORTANCE_LEVELS,
  SKILL_TYPES,
  ACTIVITY_SCOPE,

  COMPANY_TYPES,
  COMPANY_STRUCTURE_TYPES,
  MANAGER_ROLES,
  SHAREHOLDER_TYPES_COMPANY,
  SHAREHOLDER_BOARD_MEMBERSHIP,
  ORG_STRUCTURE_LEVELS,
  ORG_UNIT_TYPES,
  PARENT_UNITS,

  types,
  marketPositions,
  revenueShares,
  marketTypes,
  marketPenetration,
  customerCategories,
  productImportance,
  revenueImpact,
  loyaltyLevels,
  shareOfWallet,

  categoryOptions,
  accessLevelOptions,
  rarityOptions,
  imitabilityOptions,

  BARGAINING_POWER,
  COST_IMPACT_LEVELS,
  PURCHASE_BUDGET_SHARES,
  PROCUREMENT_CATEGORIES,
};
