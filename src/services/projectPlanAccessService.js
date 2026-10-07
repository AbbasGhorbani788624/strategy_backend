const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const { createStrategyFlowError } = require("../utils/strategyPlanResume");

const PLAN_PERMISSION = {
  VIEW: "VIEW",
  EDIT: "EDIT",
};

const findActivePlanAccess = async (projectPlanId, userId) =>
  prisma.projectPlanAccess.findFirst({
    where: {
      projectPlanId,
      userId,
      revokedAt: null,
    },
  });

const loadPlanCompanyId = async (projectPlanId) => {
  const plan = await prisma.projectPlan.findUnique({
    where: { id: projectPlanId },
    select: {
      id: true,
      projectId: true,
      project: { select: { companyId: true } },
    },
  });

  if (!plan) {
    return null;
  }

  return {
    id: plan.id,
    projectId: plan.projectId,
    companyId: plan.project.companyId,
  };
};

const memberHasProjectActionOnPlan = async (userId, projectId) => {
  const grant = await prisma.projectAccess.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { canAction: true },
  });
  return Boolean(grant?.canAction);
};

const resolveProjectPlanAccess = async (user, projectPlanId) => {
  const planMeta = await loadPlanCompanyId(projectPlanId);

  if (!planMeta) {
    return { allowed: false, permission: null, reason: "NOT_FOUND" };
  }

  if (!user?.companyId || planMeta.companyId !== user.companyId) {
    return { allowed: false, permission: null, reason: "FORBIDDEN" };
  }

  if (user.role === "COMPANY" || user.role === "SUPER_ADMIN") {
    return {
      allowed: true,
      permission: PLAN_PERMISSION.EDIT,
      isOwner: user.role === "COMPANY",
    };
  }

  if (user.role === "MEMBER") {
    const access = await findActivePlanAccess(projectPlanId, user.id);
    if (access) {
      return {
        allowed: true,
        permission: access.permission,
        isOwner: false,
        grantedAt: access.createdAt,
      };
    }

    if (
      planMeta.projectId &&
      (await memberHasProjectActionOnPlan(user.id, planMeta.projectId))
    ) {
      return {
        allowed: true,
        permission: PLAN_PERMISSION.EDIT,
        isOwner: false,
        viaProjectAction: true,
      };
    }

    return { allowed: false, permission: null, reason: "NO_GRANT" };
  }

  return { allowed: false, permission: null, reason: "FORBIDDEN" };
};

const assertProjectPlanAccess = async (
  user,
  projectPlanId,
  required = PLAN_PERMISSION.VIEW,
) => {
  const resolved = await resolveProjectPlanAccess(user, projectPlanId);

  if (!resolved.allowed) {
    if (resolved.reason === "NOT_FOUND") {
      createStrategyFlowError(
        "PROJECT_PLAN_NOT_FOUND",
        "برنامه پروژه یافت نشد",
        404,
      );
    }
    createStrategyFlowError(
      "PLAN_ACCESS_DENIED",
      "به این برنامه پروژه دسترسی ندارید",
      403,
    );
  }

  if (
    required === PLAN_PERMISSION.EDIT &&
    resolved.permission !== PLAN_PERMISSION.EDIT
  ) {
    createStrategyFlowError(
      "PLAN_EDIT_DENIED",
      "فقط مشاهده مجاز است",
      403,
    );
  }

  return resolved;
};

const assertProjectPlanAccessOnLoadedPlan = async (
  user,
  plan,
  required = PLAN_PERMISSION.VIEW,
) => {
  if (!plan?.id) {
    createStrategyFlowError(
      "PROJECT_PLAN_NOT_FOUND",
      "برنامه پروژه یافت نشد",
      404,
    );
  }
  return assertProjectPlanAccess(user, plan.id, required);
};

const assertCompanyProjectPlanRole = (user) => {
  if (!["COMPANY", "SUPER_ADMIN"].includes(user.role)) {
    createStrategyFlowError(
      "PROJECT_PLAN_COMPANY_ONLY",
      "این عملیات فقط برای مدیر شرکت مجاز است",
      403,
    );
  }
};

const formatAccessForResponse = async (user, projectPlanId) => {
  const resolved = await resolveProjectPlanAccess(user, projectPlanId);
  if (!resolved.allowed) {
    return null;
  }
  return {
    permission: resolved.permission,
    isOwner: Boolean(resolved.isOwner),
  };
};

const assertCompanyOwnership = (user, projectCompanyId) => {
  if (user.role === "SUPER_ADMIN") {
    return;
  }

  if (!user.companyId || user.companyId !== projectCompanyId) {
    createStrategyFlowError(
      "PLAN_ACCESS_DENIED",
      "به این برنامه پروژه دسترسی ندارید",
      403,
    );
  }
};

module.exports = {
  PLAN_PERMISSION,
  resolveProjectPlanAccess,
  assertProjectPlanAccess,
  assertProjectPlanAccessOnLoadedPlan,
  assertCompanyProjectPlanRole,
  formatAccessForResponse,
  findActivePlanAccess,
  assertCompanyOwnership,
};
