const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
];

const PERSIAN_NUMBER_WORDS = {
  یک: 1,
  يک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  يازده: 11,
  دوازده: 12,
};

const normalizeFrequency = (frequency) => {
  if (!frequency) return "MONTHLY";
  if (typeof frequency === "string") {
    const value = frequency.toUpperCase();
    if (["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].includes(value)) {
      return value;
    }
  }
  return "MONTHLY";
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const isLeapGregorian = (year) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const gregorianToJalali = (gy, gm, gd) => {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    gDaysInMonth[gm - 1];

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm;
  let jd;

  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { year: jy, month: jm, day: jd };
};

const jalaliToGregorian = (jy, jm, jd) => {
  let gy;
  let gm;
  let gd;
  let days =
    -355668 +
    365 * (jy + 1595) +
    Math.floor((jy + 1595) / 33) * 8 +
    Math.floor((((jy + 1595) % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) {
      days += 1;
    }
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  gd = days + 1;
  const salA = [
    0,
    31,
    isLeapGregorian(gy) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  gm = 0;
  while (gm < 13 && gd > salA[gm]) {
    gd -= salA[gm];
    gm += 1;
  }

  return { year: gy, month: gm, day: gd };
};

const dateToJalali = (date) => {
  const value = new Date(date);
  return gregorianToJalali(
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
  );
};

const jalaliToDate = (jy, jm, jd, endOfDayFlag = false) => {
  const { year, month, day } = jalaliToGregorian(jy, jm, jd);
  const value = new Date(year, month - 1, day);
  return endOfDayFlag ? endOfDay(value) : startOfDay(value);
};

const jalaliMonthLength = (jy, jm) => {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const leapRemainders = [1, 5, 9, 13, 17, 22, 26, 30];
  return leapRemainders.includes(jy % 33) ? 30 : 29;
};

const addJalaliMonths = (jy, jm, count) => {
  const totalMonths = jm - 1 + count;
  const year = jy + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return { year, month };
};

const getJalaliMonthEnd = (jy, jm) =>
  jalaliToDate(jy, jm, jalaliMonthLength(jy, jm), true);

const normalizePeriodText = (text) =>
  String(text || "")
    .trim()
    .replace(/\u200c/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();

const extractMonthCount = (normalized) => {
  if (
    normalized.includes("یکسال") ||
    normalized.includes("یک سال") ||
    normalized.includes("12 ماه") ||
    normalized.includes("دوازده ماه")
  ) {
    return 12;
  }

  const digitMatch = normalized.match(/(\d+)\s*ماه/);
  if (digitMatch) {
    const count = Number(digitMatch[1]);
    if (count >= 1 && count <= 12) {
      return count;
    }
  }

  for (const [word, count] of Object.entries(PERSIAN_NUMBER_WORDS)) {
    if (
      normalized.includes(`${word} ماه`) ||
      normalized === `${word}ماهه` ||
      normalized.includes(`${word}ماهه`)
    ) {
      return count;
    }
  }

  if (normalized.includes("سه ماه") || normalized.includes("فصلی") || normalized.includes("فصل")) {
    return 3;
  }

  if (normalized.includes("شش ماه")) {
    return 6;
  }

  if (normalized.includes("نه ماه")) {
    return 9;
  }

  return null;
};

const splitByToFrequency = (splitBy) => {
  if (splitBy === "DAY") return "DAILY";
  if (splitBy === "WEEK") return "WEEKLY";
  return "MONTHLY";
};

const isWeeklyPeriodText = (normalized) => {
  if (!normalized) return false;
  if (normalized.includes("weekly") || normalized.includes("هفتگی")) {
    return true;
  }

  if (normalized.includes("ماه")) {
    return false;
  }

  return normalized.includes("هفت") || normalized.includes("هفته");
};

const buildPeriodConfig = (input, config) => ({
  ...config,
  label:
    typeof input === "string" && input.trim() ? input.trim() : config.label,
});

const parseMeasurementPeriodConfig = (input) => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    if (input.splitBy === "DAY" || input.durationDays === 7) {
      return {
        label: input.label || "هفتگی",
        splitBy: "DAY",
        durationDays: Number(input.durationDays) || 7,
        durationMonths: null,
        frequency: "DAILY",
      };
    }

    if (input.splitBy === "WEEK" || input.durationMonths === 1) {
      return {
        label: input.label || "ماهانه",
        splitBy: "WEEK",
        durationDays: null,
        durationMonths: 1,
        frequency: "WEEKLY",
      };
    }

    const months = Number(input.durationMonths) || 3;
    return {
      label: input.label || `${months} ماهه`,
      splitBy: "MONTH",
      durationDays: null,
      durationMonths: months,
      frequency: "MONTHLY",
    };
  }

  const normalized = normalizePeriodText(input);

  if (!normalized) {
    return buildPeriodConfig(input, {
      label: "ماهانه",
      splitBy: "WEEK",
      durationDays: null,
      durationMonths: 1,
      frequency: "WEEKLY",
    });
  }

  if (normalized.includes("روز") || normalized.includes("daily")) {
    return buildPeriodConfig(input, {
      label: "روزانه",
      splitBy: "DAY",
      durationDays: 7,
      durationMonths: null,
      frequency: "DAILY",
    });
  }

  const monthCount = extractMonthCount(normalized);

  if (
    monthCount === 1 ||
    normalized === "ماهانه" ||
    normalized.includes("monthly") ||
    (normalized.includes("ماه") &&
      !normalized.includes("ماهه") &&
      !monthCount)
  ) {
    return buildPeriodConfig(input, {
      label: "ماهانه",
      splitBy: "WEEK",
      durationDays: null,
      durationMonths: 1,
      frequency: "WEEKLY",
    });
  }

  if (monthCount && monthCount > 1) {
    return buildPeriodConfig(input, {
      label: `${monthCount} ماهه`,
      splitBy: "MONTH",
      durationDays: null,
      durationMonths: monthCount,
      frequency: monthCount >= 12 ? "YEARLY" : "MONTHLY",
    });
  }

  if (normalized.includes("سال") || normalized.includes("year")) {
    return buildPeriodConfig(input, {
      label: "یکسال",
      splitBy: "MONTH",
      durationDays: null,
      durationMonths: 12,
      frequency: "YEARLY",
    });
  }

  if (isWeeklyPeriodText(normalized)) {
    return buildPeriodConfig(input, {
      label: "هفتگی",
      splitBy: "DAY",
      durationDays: 7,
      durationMonths: null,
      frequency: "DAILY",
    });
  }

  return buildPeriodConfig(input, {
    label: "ماهانه",
    splitBy: "WEEK",
    durationDays: null,
    durationMonths: 1,
    frequency: "WEEKLY",
  });
};

const mapMeasurementPeriodText = (text) =>
  parseMeasurementPeriodConfig(text).frequency;

const generateDaySplitPeriods = (startDate, durationDays = 7) => {
  const periods = [];
  const start = startOfDay(startDate);

  for (let index = 0; index < durationDays; index += 1) {
    const periodStart = new Date(start);
    periodStart.setDate(periodStart.getDate() + index);
    const periodEnd = endOfDay(periodStart);

    periods.push({
      periodStart,
      periodEnd,
      periodLabel: PERSIAN_WEEKDAYS[periodStart.getDay()],
    });
  }

  return periods;
};

const generateWeekSplitPeriods = (startDate) => {
  const periods = [];
  const start = startOfDay(startDate);
  const { year, month } = dateToJalali(start);
  const monthEnd = getJalaliMonthEnd(year, month);
  let cursor = new Date(start);
  let weekIndex = 1;

  while (cursor <= monthEnd) {
    const periodStart = new Date(cursor);
    const periodEnd = endOfDay(new Date(cursor));
    periodEnd.setDate(periodEnd.getDate() + 6);

    if (periodEnd > monthEnd) {
      periodEnd.setTime(monthEnd.getTime());
    }

    periods.push({
      periodStart,
      periodEnd,
      periodLabel: `هفته ${weekIndex}`,
    });

    weekIndex += 1;
    cursor = new Date(periodEnd);
    cursor.setDate(cursor.getDate() + 1);
    cursor = startOfDay(cursor);
  }

  return periods;
};

const generateMonthSplitPeriods = (startDate, durationMonths = 1) => {
  const periods = [];
  const start = startOfDay(startDate);
  const startJalali = dateToJalali(start);

  for (let index = 0; index < durationMonths; index += 1) {
    const { year, month } = addJalaliMonths(
      startJalali.year,
      startJalali.month,
      index,
    );
    const monthStart = jalaliToDate(year, month, 1);
    const monthEnd = getJalaliMonthEnd(year, month);
    const periodStart = index === 0 && start > monthStart ? start : monthStart;

    periods.push({
      periodStart,
      periodEnd: monthEnd,
      periodLabel: PERSIAN_MONTHS[month - 1],
    });
  }

  return periods;
};

const generateMonitoringPeriods = ({
  startDate,
  durationMonths,
  durationDays,
  frequency,
  splitBy,
  measurementPeriodLabel,
} = {}) => {
  const start = startDate ? new Date(startDate) : new Date();

  if (measurementPeriodLabel) {
    const config = parseMeasurementPeriodConfig(measurementPeriodLabel);
    return generateMonitoringPeriods({
      startDate: start,
      splitBy: config.splitBy,
      durationMonths: config.durationMonths,
      durationDays: config.durationDays,
    });
  }

  if (splitBy === "DAY") {
    return generateDaySplitPeriods(start, durationDays || 7);
  }

  if (splitBy === "WEEK") {
    return generateWeekSplitPeriods(start);
  }

  if (splitBy === "MONTH") {
    return generateMonthSplitPeriods(start, durationMonths || 1);
  }

  const legacyFrequency = normalizeFrequency(frequency);
  const legacyMonths = durationMonths || 6;

  if (legacyFrequency === "WEEKLY") {
    return generateWeekSplitPeriods(start);
  }

  if (legacyFrequency === "DAILY") {
    return generateDaySplitPeriods(start, durationDays || 7);
  }

  return generateMonthSplitPeriods(start, legacyMonths);
};

const formatMonitoringDuration = (measure) => {
  if (measure?.monitoringDurationDays) {
    return {
      value: measure.monitoringDurationDays,
      unit: "DAY",
      label: `${measure.monitoringDurationDays} روز`,
    };
  }

  if (measure?.monitoringDurationMonths) {
    return {
      value: measure.monitoringDurationMonths,
      unit: "MONTH",
      label: `${measure.monitoringDurationMonths} ماه`,
    };
  }

  return {
    value: null,
    unit: null,
    label: null,
  };
};

module.exports = {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  normalizeFrequency,
  parseMeasurementPeriodConfig,
  mapMeasurementPeriodText,
  splitByToFrequency,
  generateMonitoringPeriods,
  formatMonitoringDuration,
  dateToJalali,
};
