const MEASURE_DESIRABILITY = {
  INCREASING: "INCREASING",
  DECREASING: "DECREASING",
  ON_TARGET: "ON_TARGET",
};

const DESIRABILITY_LABELS = {
  INCREASING: "افزایشی",
  DECREASING: "کاهشی",
  ON_TARGET: "تطابق با هدف",
};

const normalizeDesirabilityText = (value) =>
  String(value || "")
    .trim()
    .replace(/\u200c/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .toLowerCase();

const parseMeasureDesirability = (input, { defaultValue = "INCREASING" } = {}) => {
  if (input === null || input === undefined || input === "") {
    return defaultValue;
  }

  if (typeof input === "string") {
    const upper = input.trim().toUpperCase();
    if (Object.values(MEASURE_DESIRABILITY).includes(upper)) {
      return upper;
    }
  }

  const normalized = normalizeDesirabilityText(input);

  if (
    normalized.includes("افزای") ||
    normalized.includes("increas") ||
    normalized === "up"
  ) {
    return MEASURE_DESIRABILITY.INCREASING;
  }

  if (
    normalized.includes("کاه") ||
    normalized.includes("decreas") ||
    normalized === "down"
  ) {
    return MEASURE_DESIRABILITY.DECREASING;
  }

  if (
    normalized.includes("تطابق") ||
    normalized.includes("هدف") ||
    normalized.includes("on target") ||
    normalized.includes("on_target") ||
    normalized.includes("match")
  ) {
    return MEASURE_DESIRABILITY.ON_TARGET;
  }

  return defaultValue;
};

const formatDesirabilityLabel = (desirability) =>
  DESIRABILITY_LABELS[desirability] || null;

const formatDesirabilityResponse = (desirability) => {
  if (!desirability) {
    return null;
  }

  return {
    value: desirability,
    label: formatDesirabilityLabel(desirability),
  };
};

const pickKpiDesirabilityInput = (kpi) =>
  kpi?.desirability ?? kpi?.مطلوبیت ?? kpi?.desirabilityType ?? null;

module.exports = {
  MEASURE_DESIRABILITY,
  DESIRABILITY_LABELS,
  parseMeasureDesirability,
  formatDesirabilityLabel,
  formatDesirabilityResponse,
  pickKpiDesirabilityInput,
};
