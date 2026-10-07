const {
  resolveStageInfo,
  isReadyForMonitoring,
} = require("./strategyPlanResume");

const toCounterparty = (user) => {
  if (!user?.id) {
    return null;
  }
  const name = user.username ?? null;
  return {
    id: user.id,
    displayName: name,
    username: name,
  };
};

const strategyPlanResourceTitle = (framework) => {
  if (framework === "BSC") {
    return "BSC";
  }
  if (framework === "OKR") {
    return "OKR";
  }
  return framework ?? "Strategy plan";
};

const mapProjectRef = (project) => {
  if (!project?.id) {
    return null;
  }
  return {
    id: project.id,
    title: project.title ?? null,
  };
};

const parseInboxDirection = (query = {}) => {
  const raw = query.direction;
  if (raw === undefined || raw === null || raw === "") {
    return "received";
  }
  return raw;
};

const mapStrategyPlanAccessRowToInboxItem = (row, direction) => {
  const plan = row.plan;
  const projectRef = mapProjectRef(plan?.project);
  const counterparty =
    direction === "received"
      ? toCounterparty(row.grantedBy)
      : toCounterparty(row.user);
  const hasMeasuresApproval =
    plan?.approvals?.some((a) => a.type === "MEASURES") ?? false;
  const { stage, stageLabel } = resolveStageInfo(
    plan?.state,
    hasMeasuresApproval,
  );
  const monitoringReady = plan
    ? isReadyForMonitoring(plan, hasMeasuresApproval)
    : false;

  return {
    id: row.id,
    planId: row.planId,
    direction,
    permission: row.permission,
    counterparty,
    project: projectRef,
    projectId: projectRef?.id ?? null,
    projectTitle: projectRef?.title ?? null,
    framework: plan?.framework ?? null,
    stage,
    stageLabel,
    isReadyForMonitoring: monitoringReady,
    grantedAt: row.createdAt,
    resource: plan
      ? {
          id: plan.id,
          title: strategyPlanResourceTitle(plan.framework),
          framework: plan.framework,
        }
      : null,
    plan: plan
      ? {
          id: plan.id,
          title: strategyPlanResourceTitle(plan.framework),
          framework: plan.framework,
          status: plan.status,
        }
      : null,
    status: plan?.status ?? null,
    message: null,
    createdAt: row.createdAt,
    updatedAt: null,
    sharedBy: direction === "received" ? counterparty : undefined,
    sharedWith: direction === "sent" ? counterparty : undefined,
  };
};

const mapProjectPlanAccessRowToInboxItem = (row, direction) => {
  const plan = row.plan;
  const projectRef = mapProjectRef(plan?.project);
  const counterparty =
    direction === "received"
      ? toCounterparty(row.grantedBy)
      : toCounterparty(row.user);

  return {
    id: row.id,
    planId: row.projectPlanId,
    projectPlanId: row.projectPlanId,
    projectId: plan?.projectId ?? projectRef?.id ?? null,
    projectTitle: projectRef?.title ?? null,
    direction,
    permission: row.permission,
    counterparty,
    project: projectRef,
    status: plan?.status ?? null,
    planStatus: plan?.status ?? null,
    grantedAt: row.createdAt,
    resource: plan
      ? {
          id: plan.id,
          title: projectRef?.title ?? null,
        }
      : null,
    plan: plan
      ? {
          id: plan.id,
          title: projectRef?.title ?? null,
          status: plan.status,
        }
      : null,
    message: null,
    createdAt: row.createdAt,
    updatedAt: plan?.updatedAt ?? null,
    sharedBy: direction === "received" ? counterparty : undefined,
    sharedWith: direction === "sent" ? counterparty : undefined,
  };
};

module.exports = {
  toCounterparty,
  strategyPlanResourceTitle,
  mapProjectRef,
  parseInboxDirection,
  mapStrategyPlanAccessRowToInboxItem,
  mapProjectPlanAccessRowToInboxItem,
};
