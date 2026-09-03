const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseMeasurementPeriodConfig,
  generateMonitoringPeriods,
  dateToJalali,
} = require("../src/utils/measurePeriodUtils");

describe("parseMeasurementPeriodConfig", () => {
  it("parses weekly as 7 day split", () => {
    const config = parseMeasurementPeriodConfig("هفتگی");
    assert.equal(config.splitBy, "DAY");
    assert.equal(config.durationDays, 7);
    assert.equal(config.durationMonths, null);
  });

  it("parses monthly as week split within one month", () => {
    const config = parseMeasurementPeriodConfig("ماهانه");
    assert.equal(config.splitBy, "WEEK");
    assert.equal(config.durationMonths, 1);
  });

  it("parses multi-month periods", () => {
    const config = parseMeasurementPeriodConfig("سه ماهه");
    assert.equal(config.splitBy, "MONTH");
    assert.equal(config.durationMonths, 3);
  });

  it("parses one year", () => {
    const config = parseMeasurementPeriodConfig("یکسال");
    assert.equal(config.splitBy, "MONTH");
    assert.equal(config.durationMonths, 12);
  });

  it("parses seven months without confusing it with weekly", () => {
    const config = parseMeasurementPeriodConfig("هفت ماهه");
    assert.equal(config.splitBy, "MONTH");
    assert.equal(config.durationMonths, 7);
    assert.equal(config.durationDays, null);
    assert.equal(config.label, "هفت ماهه");
  });

  it("still parses weekly correctly", () => {
    const config = parseMeasurementPeriodConfig("هفتگی");
    assert.equal(config.splitBy, "DAY");
    assert.equal(config.durationDays, 7);
  });
});

describe("generateMonitoringPeriods", () => {
  it("creates 7 day periods for weekly", () => {
    const periods = generateMonitoringPeriods({
      startDate: new Date("2025-11-01T00:00:00"),
      splitBy: "DAY",
      durationDays: 7,
    });

    assert.equal(periods.length, 7);
    assert.ok(periods[0].periodLabel);
  });

  it("creates week periods for one month", () => {
    const periods = generateMonitoringPeriods({
      startDate: new Date("2025-11-01T00:00:00"),
      splitBy: "WEEK",
      durationMonths: 1,
    });

    assert.ok(periods.length >= 3);
    assert.match(periods[0].periodLabel, /هفته/);
  });

  it("creates jalali month periods for multi-month duration", () => {
    const startDate = new Date("2025-10-23T00:00:00");
    const { month } = dateToJalali(startDate);
    const periods = generateMonitoringPeriods({
      startDate,
      splitBy: "MONTH",
      durationMonths: 3,
    });

    assert.equal(periods.length, 3);
    assert.equal(periods[0].periodLabel, "آبان");
    assert.equal(periods[1].periodLabel, "آذر");
    assert.equal(periods[2].periodLabel, "دی");
    assert.equal(month, 8);
  });
});
