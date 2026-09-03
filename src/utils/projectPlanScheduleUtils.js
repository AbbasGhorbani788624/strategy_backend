const AT_RISK_THRESHOLD = 15;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hasActionDates = (startDate, endDate) => Boolean(startDate && endDate);

const isActionCompleted = (action) => (action.progress ?? 0) >= 100;

const isActionInProgress = (action) =>
  !isActionCompleted(action) &&
  (action.status === "IN_PROGRESS" ||
    ((action.progress ?? 0) > 0 && (action.progress ?? 0) < 100));

const isActionNotStarted = (action) =>
  !isActionCompleted(action) && !isActionInProgress(action);

const calculateExpectedProgress = (startDate, endDate, now = new Date()) => {
  if (!hasActionDates(startDate, endDate)) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(now);

  if (current < start) {
    return 0;
  }

  if (current >= end) {
    return 100;
  }

  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) {
    return 100;
  }

  const elapsedMs = current.getTime() - start.getTime();
  return clamp(Math.round((elapsedMs / totalMs) * 100), 0, 100);
};

const calculateScheduleStatus = (action, now = new Date()) => {
  const progress = action.progress ?? 0;

  if (isActionCompleted(action)) {
    return "ON_TRACK";
  }

  if (!hasActionDates(action.startDate, action.endDate)) {
    return "ON_TRACK";
  }

  if (progress >= 100) {
    return "ON_TRACK";
  }

  const current = new Date(now);

  if (current > new Date(action.endDate)) {
    return "DELAYED";
  }

  const expectedProgress = calculateExpectedProgress(
    action.startDate,
    action.endDate,
    current,
  );

  if (expectedProgress - progress > AT_RISK_THRESHOLD) {
    return "AT_RISK";
  }

  return "ON_TRACK";
};

const deriveActionStatusFromProgress = (progress) => {
  if (progress <= 0) {
    return "NOT_STARTED";
  }

  if (progress >= 100) {
    return "COMPLETED";
  }

  return "IN_PROGRESS";
};

const enrichActionWithSchedule = (action, now = new Date()) => {
  const expectedProgress = calculateExpectedProgress(
    action.startDate,
    action.endDate,
    now,
  );
  const scheduleStatus = calculateScheduleStatus(action, now);

  return {
    ...action,
    previouslyCompleted: (action.progress ?? 0) >= 100,
    expectedProgress,
    scheduleStatus,
  };
};

const calculateOverallProgress = (actions) => {
  if (!actions?.length) {
    return 0;
  }

  const total = actions.reduce((sum, action) => sum + (action.progress ?? 0), 0);
  return Math.round(total / actions.length);
};

const calculateExpectedOverallProgress = (actions, now = new Date()) => {
  const datedActions = actions?.filter((action) =>
    hasActionDates(action.startDate, action.endDate),
  );

  if (!datedActions?.length) {
    return 0;
  }

  const total = datedActions.reduce(
    (sum, action) =>
      sum +
      calculateExpectedProgress(action.startDate, action.endDate, now),
    0,
  );

  return Math.round(total / datedActions.length);
};

const calculatePlanScheduleStatus = (actions, now = new Date()) => {
  if (!actions?.length) {
    return "ON_TRACK";
  }

  const enriched = actions.map((action) =>
    calculateScheduleStatus(action, now),
  );

  if (enriched.includes("DELAYED")) {
    return "DELAYED";
  }

  if (enriched.includes("AT_RISK")) {
    return "AT_RISK";
  }

  return "ON_TRACK";
};

const calculateControlSummary = (actions, now = new Date()) => {
  const enriched = actions.map((action) => ({
    ...action,
    scheduleStatus: calculateScheduleStatus(action, now),
  }));

  return {
    overallProgress: calculateOverallProgress(actions),
    expectedOverallProgress: calculateExpectedOverallProgress(actions, now),
    totalActions: actions.length,
    completedActions: enriched.filter((a) => isActionCompleted(a)).length,
    inProgressActions: enriched.filter((a) => isActionInProgress(a)).length,
    notStartedActions: enriched.filter((a) => isActionNotStarted(a)).length,
    delayedActions: enriched.filter((a) => a.scheduleStatus === "DELAYED")
      .length,
    atRiskActions: enriched.filter((a) => a.scheduleStatus === "AT_RISK")
      .length,
  };
};

const getPlanDateRange = (actions) => {
  const datedActions =
    actions?.filter((action) =>
      hasActionDates(action.startDate, action.endDate),
    ) || [];

  if (!datedActions.length) {
    return { startDate: null, endDate: null };
  }

  const startDate = datedActions.reduce(
    (min, action) =>
      !min || new Date(action.startDate) < new Date(min)
        ? action.startDate
        : min,
    null,
  );

  const endDate = datedActions.reduce(
    (max, action) =>
      !max || new Date(action.endDate) > new Date(max) ? action.endDate : max,
    null,
  );

  return { startDate, endDate };
};

module.exports = {
  AT_RISK_THRESHOLD,
  hasActionDates,
  isActionCompleted,
  isActionInProgress,
  isActionNotStarted,
  calculateExpectedProgress,
  calculateScheduleStatus,
  deriveActionStatusFromProgress,
  enrichActionWithSchedule,
  calculateOverallProgress,
  calculateExpectedOverallProgress,
  calculatePlanScheduleStatus,
  calculateControlSummary,
  getPlanDateRange,
};
