const yup = require("yup");

const {
  ORGANIZATIONAL_LEVELS,
  DEGREE_TYPES,
  SKILL_TYPES,
  EXPECTED_LEVELS,
  CURRENT_LEVELS,
  JOB_RELEVANCE,
  IMPORTANCE_LEVELS,
  COURSE_LEVELS,
} = require("../configs/profileConfig.js");

const validOrganizationalLevels = ORGANIZATIONAL_LEVELS.map(
  (level) => level.value,
);
const validDEGREE_TYPES = DEGREE_TYPES.map((level) => level.value);
const validSKILL_TYPES = SKILL_TYPES.map((level) => level.value);
const validEXPECTED_LEVELS = EXPECTED_LEVELS.map((level) => level.value);
const validJOB_RELEVANCE = JOB_RELEVANCE.map((level) => level.value);
const validCURRENT_LEVELS = CURRENT_LEVELS.map((level) => level.value);
const validIMPORTANCE_LEVELS = IMPORTANCE_LEVELS.map((level) => level.value);
const validCOURSE_LEVELS = COURSE_LEVELS.map((level) => level.value);

const educationItemSchema = yup.object().shape({
  id: yup.string().required(),
  degree: yup
    .string()
    .required("مدرک تحصیلی الزامی است")
    .oneOf(validDEGREE_TYPES, "مدرک تحصیلی نامعتبر است"),

  fieldOfStudy: yup.string().required("رشته تحصیلی الزامی است"),
  specialization: yup.string().optional().default(""),

  graduationYear: yup
    .number()
    .integer("سال باید عدد صحیح باشد")
    .min(1300, "سال فارغ‌التحصیلی نمی‌تواند قبل از ۱۳۰۰ باشد")
    .max(new Date().getFullYear() + 1, "سال نمی‌تواند در آینده باشد")
    .required("سال اخذ مدرک الزامی است"),

  university: yup.string().optional("نام دانشگاه الزامی است"),
});

const trainingItemSchema = yup.object().shape({
  id: yup.string().required(),
  courseName: yup.string().required("نام دوره آموزشی الزامی است"),
  level: yup
    .string()
    .required("سطح دوره الزامی است")
    .oneOf(validCOURSE_LEVELS, "سطح دوره نامعتبر است"),

  hours: yup
    .number()
    .integer("تعداد ساعت باید عدد صحیح باشد")
    .min(1, "ساعت دوره نمی‌تواند کمتر از ۱ باشد")
    .required("تعداد ساعت الزامی است"),

  provider: yup.string().required("نام برگزارکننده الزامی است"),

  date: yup
    .date()
    .required("تاریخ برگزاری الزامی است")
    .typeError("تاریخ نامعتبر است")
    .max(new Date(), "تاریخ برگزاری نمی‌تواند در آینده باشد"),
});

const competencyItemSchema = yup.object().shape({
  id: yup.string().required(),
  competencyName: yup.string().required("نام شایستگی الزامی است"),
  type: yup
    .string()
    .required("نوع شایستگی الزامی است")
    .oneOf(validSKILL_TYPES, "نوع شایستگی نامعتبر است"),

  expectedLevel: yup
    .string()
    .required("سطح مورد انتظار شغل الزامی است")
    .oneOf(validEXPECTED_LEVELS, "سطح مورد انتظار نامعتبر است"),

  currentLevel: yup
    .string()
    .required("سطح فعلی الزامی است")
    .oneOf(validCURRENT_LEVELS, "سطح فعلی نامعتبر است"),

  yearsOfExperience: yup
    .number()
    .integer("تعداد سال باید عدد صحیح باشد")
    .min(0, "سال نمی‌تواند منفی باشد")
    .required("تعداد سال‌های برخورداری الزامی است"),

  jobRelevance: yup
    .string()
    .required("میزان ارتباط با شغل الزامی است")
    .oneOf(validJOB_RELEVANCE, "میزان ارتباط نامعتبر است"),

  importance: yup
    .string()
    .required("درجه اهمیت الزامی است")
    .oneOf(validIMPORTANCE_LEVELS, "درجه اهمیت نامعتبر است"),
});

const section1Schema = yup.object().shape({
  firstName: yup.string().required("نام الزامی است"),
  lastName: yup.string().required("نام خانوادگی الزامی است"),
  nationalCode: yup
    .string()
    .required("کد ملی الزامی است")
    .matches(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد"),
  jobTitle: yup.string().required("سمت الزامی است"),
  birthDate: yup
    .date()
    .required("تاریخ تولد الزامی است")
    .typeError("تاریخ نامعتبر است"),
  lastJobTitle: yup.string().optional(),

  SHAREHOLDER: yup.boolean().default(false),
  BOARD_MEMBER: yup.boolean().default(false),
  STRATEGY_TEAM_MEMBER: yup.boolean().default(false),

  organizationalLevel: yup
    .string()
    .oneOf(validOrganizationalLevels, "رده سازمانی نامعتبر است")
    .required("رده سازمانی الزامی است"),
});

const section2Schema = yup.object().shape({
  academicRecords: yup
    .array()
    .of(educationItemSchema)
    .min(1, "حداقل یک سابقه تحصیلی الزامی است")
    .required("لیست سوابق تحصیلی الزامی است"),
});

const section3Schema = yup.object().shape({
  educationalRecords: yup
    .array()
    .of(trainingItemSchema)
    .min(1, "حداقل یک دوره آموزشی الزامی است")
    .required("لیست سوابق آموزشی الزامی است"),
});

const section4Schema = yup.object().shape({
  capabilitiesRecords: yup
    .array()
    .of(competencyItemSchema)
    .min(1, "حداقل یک شایستگی الزامی است")
    .required("لیست شایستگی‌ها الزامی است"),
});

const section5Schema = yup.object().shape({
  finalMapping: yup
    .string()
    .optional()
    .max(2000, "متن نگاشت نهایی نمی‌تواند بیشتر از ۲۰۰۰ کاراکتر باشد")
    .default(""),
});

const sectionSchemas = {
  User_Information: section1Schema,
  Academic_records: section2Schema,
  Educational_records: section3Schema,
  Capabilities_and_Competencies: section4Schema,
  The_final_map: section5Schema,
};

module.exports = { sectionSchemas };
