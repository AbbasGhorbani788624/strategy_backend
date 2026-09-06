const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseMeasureDesirability,
  formatDesirabilityResponse,
} = require("../src/utils/measureDesirabilityUtils");
const { pickNormalizedKpi } = require("../src/services/strategyMeasureSyncService");

describe("parseMeasureDesirability", () => {
  it("parses enum values", () => {
    assert.equal(parseMeasureDesirability("INCREASING"), "INCREASING");
    assert.equal(parseMeasureDesirability("DECREASING"), "DECREASING");
    assert.equal(parseMeasureDesirability("ON_TARGET"), "ON_TARGET");
  });

  it("parses persian labels", () => {
    assert.equal(parseMeasureDesirability("افزایشی"), "INCREASING");
    assert.equal(parseMeasureDesirability("کاهشی"), "DECREASING");
    assert.equal(parseMeasureDesirability("تطابق با هدف"), "ON_TARGET");
  });

  it("defaults to increasing when empty", () => {
    assert.equal(parseMeasureDesirability(null), "INCREASING");
  });
});

describe("formatDesirabilityResponse", () => {
  it("returns value and label", () => {
    assert.deepEqual(formatDesirabilityResponse("DECREASING"), {
      value: "DECREASING",
      label: "کاهشی",
    });
  });
});

describe("pickNormalizedKpi", () => {
  it("normalizes kpi desirability from persian field", () => {
    const kpi = pickNormalizedKpi({
      metric: "هزینه",
      formula: "A/B",
      measurementPeriod: "ماهانه",
      مطلوبیت: "کاهشی",
    });

    assert.equal(kpi.desirability, "DECREASING");
  });
});
