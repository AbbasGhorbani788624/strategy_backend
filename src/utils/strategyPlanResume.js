const INACTIVE_STRATEGY_STATUSES = ["ARCHIVED"];

const buildActivePlanWhere = ({ projectId, framework, companyId }) => ({
  projectId,
  framework,
  companyId,
  status: { notIn: INACTIVE_STRATEGY_STATUSES },
});

const resolveContinueAction = (state) => {
  const mapping = {
    MAP_GENERATION: "MAP_VALIDATION",
    MAP_VALIDATION: "MAP_VALIDATION",
    KPI_GENERATION: "KPI_VALIDATION",
    KPI_VALIDATION: "KPI_VALIDATION",
    TABLE_GENERATION: "TABLE_VALIDATION",
    TABLE_VALIDATION: "TABLE_VALIDATION",
    READY_FOR_MONITORING: "READY_FOR_MONITORING",
    MONITORING: "MONITORING",
    FAILED: "FAILED",
  };

  return mapping[state] || state;
};

const resolveStageInfo = (state, hasMeasuresApproval = false) => {
  if (state === "MONITORING") {
    return { stage: "MONITORING", stageLabel: "پایش" };
  }

  if (state === "READY_FOR_MONITORING" && hasMeasuresApproval) {
    return { stage: "APPROVED", stageLabel: "آماده پایش" };
  }

  if (state === "MAP_VALIDATION" || state === "MAP_GENERATION") {
    return { stage: "MAP", stageLabel: "نقشه استراتژی" };
  }

  if (
    state === "KPI_VALIDATION" ||
    state === "KPI_GENERATION" ||
    state === "TABLE_VALIDATION" ||
    state === "TABLE_GENERATION"
  ) {
    return { stage: "MEASURES", stageLabel: "سنجه‌ها" };
  }

  if (state === "FAILED") {
    return { stage: "FAILED", stageLabel: "خطا" };
  }

  return { stage: state, stageLabel: state };
};

const buildResumeMessage = (framework, continueAction) => {
  const frameworkLabel = framework === "BSC" ? "BSC" : "OKR";

  const actionMessages = {
    MAP_VALIDATION: `با این پروژه و روش ${frameworkLabel} قبلاً تا مرحله نقشه استراتژی پیش رفته‌اید.`,
    KPI_VALIDATION: `با این پروژه و روش ${frameworkLabel} قبلاً تا مرحله KPI پیش رفته‌اید.`,
    TABLE_VALIDATION: `با این پروژه و روش ${frameworkLabel} قبلاً تا مرحله جدول OKR پیش رفته‌اید.`,
    READY_FOR_MONITORING: `با این پروژه و روش ${frameworkLabel} قبلاً تا مرحله آماده پایش پیش رفته‌اید.`,
    MONITORING: `با این پروژه و روش ${frameworkLabel} قبلاً تا مرحله پایش پیش رفته‌اید.`,
    FAILED: `برنامه استراتژی ${frameworkLabel} این پروژه با خطا متوقف شده است.`,
  };

  return actionMessages[continueAction] || `برنامه استراتژی ${frameworkLabel} برای این پروژه از قبل وجود دارد.`;
};

const createStrategyFlowError = (code, message, statusCode = 400, data = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (data) {
    err.data = data;
  }
  throw err;
};

const assertPlanState = (plan, allowedStates, actionLabel = "این عملیات") => {
  if (!allowedStates.includes(plan.state)) {
    createStrategyFlowError(
      "INVALID_STATE_TRANSITION",
      `${actionLabel} در وضعیت فعلی (${plan.state}) مجاز نیست.`,
      400,
      { state: plan.state, allowedStates },
    );
  }
};

module.exports = {
  INACTIVE_STRATEGY_STATUSES,
  buildActivePlanWhere,
  resolveContinueAction,
  resolveStageInfo,
  buildResumeMessage,
  createStrategyFlowError,
  assertPlanState,
};
