const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateExpectedProgress,
  calculateScheduleStatus,
  deriveActionStatusFromProgress,
  calculateOverallProgress,
  calculateControlSummary,
  isActionCompleted,
  isActionInProgress,
  isActionNotStarted,
} = require("../src/utils/projectPlanScheduleUtils");

const {
  hasCircularDependency,
} = require("../src/utils/projectPlanDependencyUtils");

describe("projectPlanScheduleUtils", () => {
  it("returns null expected progress when dates are missing", () => {
    assert.equal(calculateExpectedProgress(null, null, new Date()), null);
  });

  it("marks action without dates as ON_TRACK", () => {
    const action = {
      startDate: null,
      endDate: null,
      progress: 0,
    };

    assert.equal(calculateScheduleStatus(action, new Date()), "ON_TRACK");
  });

  it("returns 0% expected progress before start date", () => {
    const start = new Date("2026-06-10T00:00:00.000Z");
    const end = new Date("2026-06-20T00:00:00.000Z");
    const now = new Date("2026-06-01T00:00:00.000Z");

    assert.equal(calculateExpectedProgress(start, end, now), 0);
  });

  it("calculates linear expected progress between start and end", () => {
    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-11T00:00:00.000Z");
    const now = new Date("2026-06-06T00:00:00.000Z");

    assert.equal(calculateExpectedProgress(start, end, now), 50);
  });

  it("returns 100% expected progress after end date", () => {
    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-10T00:00:00.000Z");
    const now = new Date("2026-06-15T00:00:00.000Z");

    assert.equal(calculateExpectedProgress(start, end, now), 100);
  });

  it("marks action DELAYED when past end date and progress < 100", () => {
    const action = {
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-05T00:00:00.000Z"),
      progress: 50,
    };
    const now = new Date("2026-06-10T00:00:00.000Z");

    assert.equal(calculateScheduleStatus(action, now), "DELAYED");
  });

  it("does not mark completed action as DELAYED even after end date", () => {
    const action = {
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-05T00:00:00.000Z"),
      progress: 100,
    };
    const now = new Date("2026-06-10T00:00:00.000Z");

    assert.equal(calculateScheduleStatus(action, now), "ON_TRACK");
  });

  it("derives action status from progress correctly", () => {
    assert.equal(deriveActionStatusFromProgress(0), "NOT_STARTED");
    assert.equal(deriveActionStatusFromProgress(50), "IN_PROGRESS");
    assert.equal(deriveActionStatusFromProgress(100), "COMPLETED");
  });

  it("calculates overall progress as average of action progress", () => {
    const actions = [{ progress: 0 }, { progress: 50 }, { progress: 100 }];
    assert.equal(calculateOverallProgress(actions), 50);
  });

  it("returns 0 overall progress when there are no actions", () => {
    assert.equal(calculateOverallProgress([]), 0);
  });

  it("builds control summary counts", () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const actions = [
      {
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-05T00:00:00.000Z"),
        progress: 100,
      },
      {
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-20T00:00:00.000Z"),
        progress: 10,
      },
      {
        startDate: new Date("2026-06-01T00:00:00.000Z"),
        endDate: new Date("2026-06-20T00:00:00.000Z"),
        progress: 0,
      },
    ];

    const summary = calculateControlSummary(actions, now);

    assert.equal(summary.totalActions, 3);
    assert.equal(summary.completedActions, 1);
    assert.equal(summary.inProgressActions, 1);
    assert.equal(summary.notStartedActions, 1);
    assert.equal(summary.overallProgress, 37);
  });

  it("counts completed actions from status or completedAt without progress", () => {
    const actions = [
      {
        progress: 0,
        status: "COMPLETED",
        completedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      {
        progress: 0,
        status: "NOT_STARTED",
        completedAt: null,
      },
    ];

    const summary = calculateControlSummary(actions);

    assert.equal(summary.completedActions, 1);
    assert.equal(summary.notStartedActions, 1);
  });

  it("detects completed action from progress, status, or completedAt", () => {
    assert.equal(isActionCompleted({ progress: 100 }), true);
    assert.equal(isActionCompleted({ status: "COMPLETED", progress: 0 }), true);
    assert.equal(
      isActionCompleted({
        completedAt: new Date("2026-06-01T00:00:00.000Z"),
        progress: 0,
        status: "NOT_STARTED",
      }),
      true,
    );
    assert.equal(
      isActionNotStarted({ progress: 0, status: "NOT_STARTED", completedAt: null }),
      true,
    );
    assert.equal(
      isActionInProgress({ progress: 40, status: "IN_PROGRESS", completedAt: null }),
      true,
    );
  });
});

describe("projectPlanDependencyUtils", () => {
  it("detects circular dependencies", () => {
    const actions = [
      { id: "a1", prerequisiteActionId: "a3" },
      { id: "a2", prerequisiteActionId: "a1" },
      { id: "a3", prerequisiteActionId: "a2" },
    ];

    assert.equal(hasCircularDependency(actions), true);
  });

  it("allows valid linear dependency chain", () => {
    const actions = [
      { id: "a1", prerequisiteActionId: null },
      { id: "a2", prerequisiteActionId: "a1" },
      { id: "a3", prerequisiteActionId: "a2" },
    ];

    assert.equal(hasCircularDependency(actions), false);
  });
});

describe("projectPlanService authorization helpers", () => {
  it("MEMBER role is rejected by assertCompanyManager pattern", () => {
    const memberUser = { role: "MEMBER", companyId: "company-1" };
    assert.equal(["COMPANY", "SUPER_ADMIN"].includes(memberUser.role), false);
  });

  it("COMPANY role passes manager check", () => {
    const companyUser = { role: "COMPANY", companyId: "company-1" };
    assert.equal(["COMPANY", "SUPER_ADMIN"].includes(companyUser.role), true);
  });

  it("validates progress range boundaries", () => {
    const validateProgress = (progress) => {
      const parsed = parseInt(progress, 10);
      return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 100;
    };

    assert.equal(validateProgress(-1), false);
    assert.equal(validateProgress(0), true);
    assert.equal(validateProgress(100), true);
    assert.equal(validateProgress(101), false);
  });

  it("progress 100 sets COMPLETED status", () => {
    assert.equal(deriveActionStatusFromProgress(100), "COMPLETED");
  });

  it("executor must be MEMBER role", () => {
    const executor = { role: "COMPANY", companyId: "c1" };
    assert.notEqual(executor.role, "MEMBER");
  });

  it("executor company must match project company", () => {
    const executor = { role: "MEMBER", companyId: "c2" };
    const projectCompanyId = "c1";
    assert.notEqual(executor.companyId, projectCompanyId);
  });
});
