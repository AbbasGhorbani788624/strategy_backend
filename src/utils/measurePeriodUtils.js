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

const mapMeasurementPeriodText = (text) => {
  if (!text || typeof text !== "string") return "MONTHLY";
  const normalized = text.trim();

  if (normalized.includes("روز") || normalized.includes("روزانه")) return "DAILY";
  if (normalized.includes("هفت") || normalized.includes("weekly")) return "WEEKLY";
  if (normalized.includes("سه ماه") || normalized.includes("فصل") || normalized.includes("quarter")) {
    return "QUARTERLY";
  }
  if (normalized.includes("سال") || normalized.includes("year")) return "YEARLY";
  if (normalized.includes("شش ماه")) return "MONTHLY";

  return "MONTHLY";
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const endOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const generateMonitoringPeriods = ({
  startDate,
  durationMonths = 6,
  frequency = "MONTHLY",
}) => {
  const normalizedFrequency = normalizeFrequency(frequency);
  const start = new Date(startDate);
  const periods = [];

  if (normalizedFrequency === "MONTHLY") {
    for (let index = 0; index < durationMonths; index += 1) {
      const periodStart = addMonths(start, index);
      const periodEnd = endOfMonth(periodStart);
      periods.push({
        periodStart,
        periodEnd,
        periodLabel: PERSIAN_MONTHS[(start.getMonth() + index) % 12],
      });
    }
    return periods;
  }

  if (normalizedFrequency === "QUARTERLY") {
    const quarterCount = Math.max(1, Math.ceil(durationMonths / 3));
    for (let index = 0; index < quarterCount; index += 1) {
      const periodStart = addMonths(start, index * 3);
      const periodEnd = endOfMonth(addMonths(periodStart, 2));
      periods.push({
        periodStart,
        periodEnd,
        periodLabel: `فصل ${index + 1}`,
      });
    }
    return periods;
  }

  if (normalizedFrequency === "WEEKLY") {
    const weekCount = Math.max(1, Math.ceil((durationMonths * 30) / 7));
    for (let index = 0; index < weekCount; index += 1) {
      const periodStart = new Date(start);
      periodStart.setDate(periodStart.getDate() + index * 7);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
      periods.push({
        periodStart,
        periodEnd,
        periodLabel: `هفته ${index + 1}`,
      });
    }
    return periods;
  }

  periods.push({
    periodStart: start,
    periodEnd: endOfMonth(addMonths(start, Math.max(durationMonths, 1) - 1)),
    periodLabel: "دوره ۱",
  });

  return periods;
};

module.exports = {
  PERSIAN_MONTHS,
  normalizeFrequency,
  mapMeasurementPeriodText,
  generateMonitoringPeriods,
};
