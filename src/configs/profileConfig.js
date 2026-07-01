const SHAREHOLDER_TYPES = [
  { value: "boardMember", label: "عضو هیات مدیره" },
  { value: "shareholder", label: "سهامدار" },
  { value: "strategyTeamMember", label: "عضو تیم استراتژی" },
];

const ORGANIZATIONAL_LEVELS = [
  { value: "CEO", label: "مدیرعامل" },
  { value: "MIDDLE_MANAGER", label: "مدیر میانی" },
  { value: "EXPERT", label: "کارشناس" },
  { value: "EMPLOYEE", label: "کارمند" },
  { value: "OTHER", label: "سایر" },
];

const ACTIVITY_SCOPE = [
  { value: "IRAN", label: " ایران" },
  { value: "INTERNATIONAL", label: "بین‌المللی" },
];

const DEGREE_TYPES = [
  { value: "DIPLOMA", label: "دیپلم" },
  { value: "ASSOCIATE_DEGREE", label: "کاردانی" },
  { value: "BACHELOR_DEGREE", label: "کارشناسی" },
  { value: "MASTER_DEGREE", label: "کارشناسی ارشد" },
  { value: "PHD", label: "دکتری" },
  { value: "POST_DOCTORATE", label: "پس‌دکتری" },
];

const COURSE_LEVELS = [
  { value: "BEGINNER", label: "مقدماتی" },
  { value: "INTERMEDIATE", label: "متوسط" },
  { value: "ADVANCED", label: "پیشرفته" },
  { value: "SPECIALIZED", label: "تخصصی" },
  { value: "CERTIFIED", label: "مدرک‌دار" },
];

const SKILL_TYPES = [
  { value: "TECHNICAL_SKILL", label: "فنی و تخصصی" },
  { value: "SOFT_SKILL", label: "مهارت‌های نرم" },
  { value: "FOREIGN_LANGUAGE", label: "زبان خارجی" },
  { value: "MANAGERIAL_SKILL", label: "مدیریتی" },
  { value: "METACOGNITIVE_SKILL", label: "فراشناختی" },
];

const EXPECTED_LEVELS = [
  { value: "LOW", label: "پایین" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "بالا" },
  { value: "MAXIMUM", label: "حداکثر" },
];

const CURRENT_LEVELS = [
  { value: "0_NO_KNOWLEDGE", label: "صفر (آشنایی ندارم)" },
  { value: "1_BASIC_AWARENESS", label: "۱ (آشنایی مقدماتی)" },
  { value: "2_BEGINNER", label: "۲ (مبتدی)" },
  { value: "3_INTERMEDIATE", label: "۳ (متوسط)" },
  { value: "4_ADVANCED", label: "۴ (پیشرفته)" },
  { value: "5_SPECIALIST", label: "۵ (متخصص)" },
];

const JOB_RELEVANCE = [
  { value: "LOW", label: "کم" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "زیاد" },
  { value: "CRITICAL", label: "حیاتی" },
];

const IMPORTANCE_LEVELS = [
  { value: "LOW", label: "کم" },
  { value: "MEDIUM", label: "متوسط" },
  { value: "HIGH", label: "زیاد" },
  { value: "CRITICAL", label: "حیاتی" },
];

////

const COMPANY_TYPES = [
  { value: "LISTED", label: "شرکت بورسی" },
  { value: "HOLDING", label: "هلدینگ" },
  { value: "SUBSIDIARY", label: "زیرمجموعه هلدینگ" },
];

// 2. ساختار شرکت (Radio Buttons در بخش اطلاعات پایه)
// نکته: این مقادیر باید با فیلد structureType در Yup همخوانی داشته باشد
const COMPANY_STRUCTURE_TYPES = [
  { value: "PUBLIC", label: "شرکت بورسی" },
  { value: "HOLDING", label: "هلدینگ" },
  { value: "SUBSIDIARY", label: "زیرمجموعه هلدینگ" },
];

// 3. مدیران - نقش در سازمان (Radio Buttons)
const MANAGER_ROLES = [
  { value: "BOARD_MEMBER", label: "عضو هیأت مدیره" },
  { value: "STRATEGY_TEAM_MEMBER", label: "عضو تیم استراتژی" },
];

// 4. سهامداران - نوع سهامدار (Drop Down)
const SHAREHOLDER_TYPES_COMPANY = [
  { value: "LEGAL", label: "حقوقی" },
  { value: "NATURAL", label: "حقیقی" },
];

const SHAREHOLDER_BOARD_MEMBERSHIP = [
  { value: "isBoardMember", label: "عضو هیأت مدیره" },
  { value: "isPreferredShare", label: "سهام ممتازی" },
];

const ORG_STRUCTURE_LEVELS = [
  { value: "EXECUTIVE", label: "مدیریت ارشد" },
  { value: "DEPARTMENT", label: "دپارتمان" },
  { value: "DIVISION", label: "واحد" },
  { value: "TEAM", label: "تیم" },
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
  { value: "innovator", label: "نوآور و پیشگام (Innovator)" },
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
  { value: "low", label: "نفوذ کم (شروع کار)" },
  { value: "medium", label: "نفوذ متوسط (رشد پایدار)" },
  { value: "high", label: "نفوذ بالا (اشباع نسبی)" },
  { value: "dominant", label: "نفوذ غالب (تسلط بر بازار)" },
  { value: "new_entry", label: "ورود تازه (شروع فعالیت)" },
];

const relatedProducts = [
  { value: "core_product", label: "محصول هسته‌ای اصلی" },
  { value: "complementary_service", label: "خدمت مکمل" },
  { value: "new_product", label: "محصول جدید" },
  { value: "upgrade", label: "نسخه ارتقا یافته" },
  { value: "consulting", label: "خدمات مشاوره‌ای" },
];

const customerCategories = [
  { value: "b2c", label: "مصرف‌کننده نهایی (B2C)" },
  { value: "b2b_enterprise", label: "سازمانی بزرگ (Enterprise B2B)" },
  { value: "b2b_smb", label: "سازمانی کوچک و متوسط (SMB B2B)" },
  { value: "government", label: "دولتی و نیمه‌دولتی" },
  { value: "reseller", label: "بازاریاب / نماینده فروش" },
  { value: "partner", label: "شریک تجاری استراتژیک" },
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

///////////////////

// 1. دسته‌بندی (مثال: نوع منبع یا دارایی)
const categoryOptions = [
  { value: "raw_material", label: "مواد اولیه" },
  { value: "technology", label: "فناوری و دانش" },
  { value: "human_resource", label: "نیروی انسانی و تخصص" },
  { value: "brand_reputation", label: "برند و شهرت" },
  { value: "infrastructure", label: "زیرساخت و تجهیزات" },
];

// 2. سطح برخورداری (دسترسی یا سهم بازار)
const accessLevelOptions = [
  { value: "exclusive", label: "انحصاری (۱۰۰٪ نیاز توسط ما تأمین می‌شود)" },
  { value: "dominant", label: "غالب (بیش از ۷۰٪)" },
  { value: "majority", label: "اکثریت (۵۰٪ تا ۷۰٪)" },
  { value: "competitive", label: "رقابتی (۲۰٪ تا ۵۰٪)" },
  { value: "minor", label: "ناچیز (کمتر از ۲۰٪)" },
];

// 3. نادر بودن (Rarity)
const rarityOptions = [
  { value: "common", label: "عمومی (رایج)" },
  { value: "uncommon", label: "غیرمعمول" },
  { value: "rare", label: "نادر" },
  { value: "very_rare", label: "بسیار نادر" },
  { value: "legendary", label: "افسانه‌ای/منحصربه‌فرد" },
];

// 4. غیر قابل تقلید بودن (Imitability)
const imitabilityOptions = [
  { value: "easily_imitated", label: "به راحتی قابل تقلید" },
  { value: "difficult", label: "دشوار برای تقلید" },
  { value: "costly_to_imitate", label: "با هزینه بسیار بالا برای تقلید" },
  { value: "impossible", label: "غیرقابل تقلید" },
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

  revenueCenters,
  types,
  marketPositions,
  revenueShares,
  marketTypes,
  marketPenetration,
  relatedProducts,
  customerCategories,
  productImportance,
  revenueImpact,
  loyaltyLevels,
  shareOfWallet,

  categoryOptions,
  accessLevelOptions,
  rarityOptions,
  imitabilityOptions,
};
