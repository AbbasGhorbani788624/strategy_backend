const prisma = require("../prismaClient");
const { createBadRequestError } = require("./index");

const INACTIVE_STRATEGY_STATUSES = ["ARCHIVED"];

/**
 * From MAP_GENERATION onward the strategy workflow is considered irreversible
 * for MEMBER-initiated project deletion (translation-only plans may still be deleted).
 */
const MEMBER_STRATEGY_DELETION_CUTOFF_STATES = [
  "MAP_GENERATION",
  "MAP_VALIDATION",
  "KPI_GENERATION",
  "KPI_VALIDATION",
  "TABLE_GENERATION",
  "TABLE_VALIDATION",
  "READY_FOR_MONITORING",
  "MONITORING",
  "FAILED",
];

const PROJECT_DELETION_SELECT = {
  id: true,
  creatorId: true,
  companyId: true,
  status: true,
  deletionLockedAt: true,
  deletionLockedById: true,
  deletionLockReason: true,
  strategyPlans: {
    select: {
      id: true,
      framework: true,
      state: true,
      status: true,
      approvals: {
        select: { type: true },
      },
    },
  },
};

const throwProjectDeletionError = (
  code,
  message,
  statusCode,
  reason,
  extraData = {},
) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.data = { reason, ...extraData };
  throw err;
};

const planHasMeasuresApproval = (plan) =>
  plan.approvals?.some((approval) => approval.type === "MEASURES");

const isActiveStrategyPlan = (plan) =>
  !INACTIVE_STRATEGY_STATUSES.includes(plan.status);

const memberBlockedByStrategyState = (strategyPlans) =>
  strategyPlans.some(
    (plan) =>
      isActiveStrategyPlan(plan) &&
      MEMBER_STRATEGY_DELETION_CUTOFF_STATES.includes(plan.state),
  );

const planIndicatesMonitoringPipeline = (plan) => {
  if (!isActiveStrategyPlan(plan)) {
    return false;
  }

  if (plan.state === "MONITORING") {
    return true;
  }

  if (plan.state === "READY_FOR_MONITORING" && planHasMeasuresApproval(plan)) {
    return true;
  }

  return false;
};

const loadProjectDeletionContext = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: PROJECT_DELETION_SELECT,
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد .", 404);
  }

  const [measurementCount, measuresWithMonitoringCount] = await Promise.all([
    prisma.strategyMeasureMeasurement.count({
      where: {
        measure: {
          strategyPlan: { projectId },
        },
      },
    }),
    prisma.strategyMeasure.count({
      where: {
        strategyPlan: { projectId },
        monitoringStatus: { not: null },
      },
    }),
  ]);

  return {
    project,
    measurementCount,
    measuresWithMonitoringCount,
  };
};

const isMonitoringProtected = ({
  project,
  measurementCount,
  measuresWithMonitoringCount,
}) => {
  if (project.status === "ARCHIVED") {
    return false;
  }

  const monitoringByPlan = project.strategyPlans.some(
    planIndicatesMonitoringPipeline,
  );

  if (monitoringByPlan) {
    return true;
  }

  if (measurementCount > 0) {
    return true;
  }

  if (measuresWithMonitoringCount > 0) {
    return true;
  }

  return false;
};

const assertDeletionRoleAccess = (user, project) => {
  if (user.role === "SUPER_ADMIN") {
    return;
  }

  if (user.role === "MEMBER") {
    if (project.creatorId !== user.id) {
      throwProjectDeletionError(
        "PROJECT_DELETION_FORBIDDEN",
        "شما مجوز حذف این پروژه را ندارید",
        403,
        "NOT_PROJECT_CREATOR",
      );
    }
    return;
  }

  if (user.role === "COMPANY") {
    if (!user.companyId || project.companyId !== user.companyId) {
      throwProjectDeletionError(
        "PROJECT_DELETION_FORBIDDEN",
        "دسترسی به حذف این پروژه مجاز نیست",
        403,
        "COMPANY_MISMATCH",
      );
    }
    return;
  }

  throwProjectDeletionError(
    "PROJECT_DELETION_FORBIDDEN",
    "شما مجوز حذف این پروژه را ندارید",
    403,
    "ROLE_NOT_ALLOWED",
  );
};

const assertDeletionLockManagementAccess = (user, project) => {
  if (user.role === "SUPER_ADMIN") {
    return;
  }

  if (user.role === "COMPANY") {
    if (!user.companyId || project.companyId !== user.companyId) {
      throwProjectDeletionError(
        "PROJECT_DELETION_FORBIDDEN",
        "دسترسی به مدیریت قفل حذف این پروژه مجاز نیست",
        403,
        "COMPANY_MISMATCH",
      );
    }
    return;
  }

  throwProjectDeletionError(
    "PROJECT_DELETION_FORBIDDEN",
    "دسترسی غیرمجاز",
    403,
    "ROLE_NOT_ALLOWED",
  );
};

/**
 * @returns {{ action: 'DELETE' | 'ARCHIVE', monitoringProtected: boolean }}
 */
const resolveDeletionAction = (user, context, { force = false } = {}) => {
  const { project, measurementCount, measuresWithMonitoringCount } = context;
  const monitoringProtected = isMonitoringProtected({
    project,
    measurementCount,
    measuresWithMonitoringCount,
  });

  if (user.role === "MEMBER") {
    if (project.deletionLockedAt) {
      throwProjectDeletionError(
        "PROJECT_DELETION_BLOCKED",
        "این پروژه توسط مدیر شرکت قفل شده و حذف آن مجاز نیست.",
        409,
        "DELETION_LOCKED",
      );
    }

    if (monitoringProtected) {
      throwProjectDeletionError(
        "PROJECT_DELETION_BLOCKED",
        "این پروژه دارای داده‌های استراتژی/پایش فعال است و حذف آن مجاز نیست.",
        409,
        "MONITORING_ACTIVE",
      );
    }

    if (memberBlockedByStrategyState(project.strategyPlans)) {
      throwProjectDeletionError(
        "PROJECT_DELETION_BLOCKED",
        "این پروژه دارای داده‌های استراتژی/پایش فعال است و حذف آن مجاز نیست.",
        409,
        "STRATEGY_IN_PROGRESS",
      );
    }

    return { action: "DELETE", monitoringProtected: false };
  }

  if (monitoringProtected) {
    if (user.role === "SUPER_ADMIN" && force === true) {
      return { action: "DELETE", monitoringProtected: true, forced: true };
    }

    return { action: "ARCHIVE", monitoringProtected: true };
  }

  return { action: "DELETE", monitoringProtected: false };
};

module.exports = {
  MEMBER_STRATEGY_DELETION_CUTOFF_STATES,
  loadProjectDeletionContext,
  assertDeletionRoleAccess,
  assertDeletionLockManagementAccess,
  resolveDeletionAction,
  isMonitoringProtected,
  throwProjectDeletionError,
};
