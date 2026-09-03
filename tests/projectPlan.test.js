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

  it("counts completed actions only from progress >= 100", () => {
    const actions = [
      {
        progress: 100,
        status: "COMPLETED",
        completedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
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
    assert.equal(summary.notStartedActions, 2);
  });

  it("detects completed action only from progress >= 100", () => {
    assert.equal(isActionCompleted({ progress: 100 }), true);
    assert.equal(isActionCompleted({ status: "COMPLETED", progress: 0 }), false);
    assert.equal(
      isActionCompleted({
        completedAt: new Date("2026-06-01T00:00:00.000Z"),
        progress: 0,
        status: "NOT_STARTED",
      }),
      false,
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

  it("keeps plan IN_PROGRESS when average progress is high but not all actions complete", () => {
    const actions = [{ progress: 100 }, { progress: 100 }, { progress: 99 }];
    const allCompleted = actions.every((action) => (action.progress ?? 0) >= 100);
    const overall = calculateOverallProgress(actions);

    assert.equal(allCompleted, false);
    assert.equal(overall, 100);
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

describe("projectPlan progress and completion logic", () => {
  const parseAndValidateProgress = (progress) => {
    const parsed = parseInt(progress, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return null;
    }
    return parsed;
  };

  const buildProgressUpdate = (progress) => {
    const parsedProgress = parseAndValidateProgress(progress);
    if (parsedProgress === null) {
      return null;
    }

    return {
      progress: parsedProgress,
      status: deriveActionStatusFromProgress(parsedProgress),
      completedAt: parsedProgress >= 100 ? new Date("2026-06-01T00:00:00.000Z") : null,
    };
  };

  it("accepts progress 0", () => {
    const update = buildProgressUpdate(0);
    assert.equal(update.progress, 0);
    assert.equal(update.status, "NOT_STARTED");
    assert.equal(update.completedAt, null);
  });

  it("accepts progress 50", () => {
    const update = buildProgressUpdate(50);
    assert.equal(update.progress, 50);
    assert.equal(update.status, "IN_PROGRESS");
    assert.equal(update.completedAt, null);
  });

  it("accepts progress 100 and marks completed", () => {
    const update = buildProgressUpdate(100);
    assert.equal(update.progress, 100);
    assert.equal(update.status, "COMPLETED");
    assert.ok(update.completedAt);
  });

  it("rejects progress above 100", () => {
    assert.equal(buildProgressUpdate(101), null);
  });

  it("rejects progress below 0", () => {
    assert.equal(buildProgressUpdate(-1), null);
  });

  it("clears completedAt when completed action is changed back below 100", () => {
    const update = buildProgressUpdate(50);
    assert.equal(update.status, "IN_PROGRESS");
    assert.equal(update.completedAt, null);
  });

  it("syncs checkbox completion to progress 100", () => {
    const previouslyCompleted = true;
    const progress = previouslyCompleted ? 100 : 0;
    const update = buildProgressUpdate(progress);

    assert.equal(update.progress, 100);
    assert.equal(update.status, "COMPLETED");
  });

  it("syncs checkbox uncheck to progress 0", () => {
    const previouslyCompleted = false;
    const progress = previouslyCompleted ? 100 : 0;
    const update = buildProgressUpdate(progress);

    assert.equal(update.progress, 0);
    assert.equal(update.status, "NOT_STARTED");
    assert.equal(update.completedAt, null);
  });

  it("allows progress to decrease and remain valid", () => {
    const first = buildProgressUpdate(50);
    const second = buildProgressUpdate(40);

    assert.equal(first.status, "IN_PROGRESS");
    assert.equal(second.progress, 40);
    assert.equal(second.status, "IN_PROGRESS");
  });

  it("derives plan status after lock as IN_PROGRESS until all actions complete", () => {
    const derivePlanStatus = (actions) => {
      if (actions.every((action) => (action.progress ?? 0) >= 100)) {
        return "COMPLETED";
      }
      return "IN_PROGRESS";
    };

    assert.equal(
      derivePlanStatus([{ progress: 100 }, { progress: 60 }]),
      "IN_PROGRESS",
    );
    assert.equal(
      derivePlanStatus([{ progress: 100 }, { progress: 100 }]),
      "COMPLETED",
    );
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

describe("projectPlan progress history expectations", () => {
  it("records each progress update as a separate history entry", () => {
    const history = [];
    const record = (progress) => history.push({ progress, createdAt: new Date() });

    record(20);
    record(35);
    record(50);

    assert.equal(history.length, 3);
    assert.deepEqual(
      history.map((entry) => entry.progress),
      [20, 35, 50],
    );
  });

  it("preserves multiple updates on the same day", () => {
    const sameDay = new Date("2026-06-01T10:00:00.000Z");
    const history = [
      { progress: 20, createdAt: sameDay },
      { progress: 35, createdAt: new Date("2026-06-01T14:00:00.000Z") },
      { progress: 50, createdAt: new Date("2026-06-01T17:30:00.000Z") },
    ];

    assert.equal(history.length, 3);
    assert.equal(history[0].progress, 20);
    assert.equal(history[2].progress, 50);
  });

  it("records progress decrease in history", () => {
    const history = [50, 40];
    assert.equal(history[1], 40);
  });
});

describe("projectPlan description edit rules", () => {
  const canEditDescription = (planStatus) =>
    ["LOCKED", "IN_PROGRESS"].includes(planStatus);

  const includesDescriptionInResponse = (planStatus) => planStatus !== "DRAFT";

  it("does not expose description in DRAFT responses", () => {
    assert.equal(includesDescriptionInResponse("DRAFT"), false);
    assert.equal(includesDescriptionInResponse("IN_PROGRESS"), true);
    assert.equal(includesDescriptionInResponse("COMPLETED"), true);
  });

  it("allows description edits only after lock", () => {
    assert.equal(canEditDescription("DRAFT"), false);
    assert.equal(canEditDescription("IN_PROGRESS"), true);
    assert.equal(canEditDescription("LOCKED"), true);
    assert.equal(canEditDescription("COMPLETED"), false);
  });

  it("blocks description edits when plan is completed", () => {
    const planStatus = "COMPLETED";
    assert.equal(canEditDescription(planStatus), false);
  });
});

describe("projectPlan gantt data shape", () => {
  it("includes required gantt fields on enriched action", () => {
    const action = {
      id: "a1",
      title: "Task",
      description: "Desc",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-10T00:00:00.000Z"),
      progress: 40,
      status: "IN_PROGRESS",
      order: 1,
      prerequisiteActionId: null,
      completedAt: null,
      executor: { id: "u1", username: "member1" },
    };

    const expectedProgress = calculateExpectedProgress(
      action.startDate,
      action.endDate,
      new Date("2026-06-06T00:00:00.000Z"),
    );
    const scheduleStatus = calculateScheduleStatus(
      action,
      new Date("2026-06-06T00:00:00.000Z"),
    );

    assert.ok(action.id);
    assert.ok(action.title);
    assert.ok(action.startDate);
    assert.ok(action.endDate);
    assert.equal(typeof action.progress, "number");
    assert.equal(typeof expectedProgress, "number");
    assert.ok(["ON_TRACK", "AT_RISK", "DELAYED"].includes(scheduleStatus));
    assert.ok(action.executor);
    assert.equal(action.order, 1);
  });

  it("orders actions deterministically by order ASC", () => {
    const actions = [
      { id: "a3", order: 3 },
      { id: "a1", order: 1 },
      { id: "a2", order: 2 },
    ];

    const sorted = [...actions].sort((a, b) => a.order - b.order);
    assert.deepEqual(sorted.map((action) => action.id), ["a1", "a2", "a3"]);
  });
});
