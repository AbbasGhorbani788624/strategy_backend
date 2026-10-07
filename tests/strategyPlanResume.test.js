const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolvePlanContinueAction,
} = require("../src/utils/strategyPlanResume");

describe("resolvePlanContinueAction", () => {
  it("BSC map stage navigates to bsc_analysis", () => {
    const action = resolvePlanContinueAction({
      id: "plan-1",
      framework: "BSC",
      state: "MAP_VALIDATION",
    });
    assert.equal(action.type, "NAVIGATE");
    assert.equal(action.planId, "plan-1");
    assert.equal(action.target, "bsc_analysis");
  });

  it("OKR table stage navigates to kpi detail", () => {
    const action = resolvePlanContinueAction({
      id: "plan-2",
      framework: "OKR",
      state: "TABLE_VALIDATION",
    });
    assert.equal(action.target, "kpi");
    assert.equal(action.framework, "OKR");
  });

  it("approved plan navigates to monitoring", () => {
    const action = resolvePlanContinueAction(
      {
        id: "plan-3",
        framework: "BSC",
        state: "READY_FOR_MONITORING",
      },
      true,
    );
    assert.equal(action.target, "monitoring");
  });
});
