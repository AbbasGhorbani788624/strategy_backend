const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFormKey,
  isAnalysisAllowed,
  isSingleFormType,
  toTierFormParams,
} = require("../src/services/companyAnalysisTierService");

const addDisableFlag = (analyses, enabledKeys) =>
  analyses.map((analysis) => ({
    ...analysis,
    disable: !enabledKeys.has(
      buildFormKey(analysis.type === "multi" ? "multi" : "single", analysis.analysisId),
    ),
  }));

describe("companyAnalysisTierUtils", () => {
  it("detects single form types", () => {
    assert.equal(isSingleFormType("single"), true);
    assert.equal(isSingleFormType(1), true);
    assert.equal(isSingleFormType("SINGLE"), true);
    assert.equal(isSingleFormType("multi"), false);
    assert.equal(isSingleFormType(2), false);
  });

  it("maps form params by type", () => {
    assert.deepEqual(toTierFormParams("form-1", 1), { formId: "form-1" });
    assert.deepEqual(toTierFormParams("form-2", 2), {
      multiAnalysisFormId: "form-2",
    });
  });

  it("checks allowed analyses from enabled tier keys", () => {
    const enabledKeys = new Set([
      buildFormKey("single", "a"),
      buildFormKey("multi", "b"),
    ]);

    assert.equal(isAnalysisAllowed(enabledKeys, "a", 1), true);
    assert.equal(isAnalysisAllowed(enabledKeys, "b", 2), true);
    assert.equal(isAnalysisAllowed(enabledKeys, "c", 1), false);
    assert.equal(isAnalysisAllowed(enabledKeys, "a", 2), false);
  });

  it("marks analyses outside enabled tiers as disabled", () => {
    const enabledKeys = new Set([buildFormKey("single", "enabled")]);

    assert.deepEqual(
      addDisableFlag(
        [
          { analysisId: "enabled" },
          { analysisId: "disabled" },
          { type: "multi", analysisId: "multi-disabled" },
        ],
        enabledKeys,
      ),
      [
        { analysisId: "enabled", disable: false },
        { analysisId: "disabled", disable: true },
        { type: "multi", analysisId: "multi-disabled", disable: true },
      ],
    );
  });
});
