const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const { createStrategyFlowError } = require("../utils/strategyPlanResume");
const {
  ACTIVE_STRATEGY_PLAN_PROJECT_SELECT,
  formatStrategyPlanProjectRefs,
} = require("../utils/strategyPlanResolve");

const PLAN_PERMISSION = {
  VIEW: "VIEW",
  EDIT: "EDIT",
};

const findActivePlanAccess = async (planId, userId) =>
  prisma.strategyPlanAccess.findFirst({
    where: {
      planId,
      userId,
      revokedAt: null,
    },
  });

const resolveRelatedProjectIdsFromPlan = (plan) => {
  const { sourceProject, inputProjects } = formatStrategyPlanProjectRefs(
    plan?.project,
  );
  const ids = new Set();
  if (plan?.projectId) {
    ids.add(plan.projectId);
  }
  if (sourceProject?.id) {
    ids.add(sourceProject.id);
  }
  for (const input of inputProjects || []) {
    if (input?.id) {
      ids.add(input.id);
    }
  }
  return ids;
};

const resolveRelatedProjectIds = async (planId) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: planId },
    include: {
      project: {
        select: ACTIVE_STRATEGY_PLAN_PROJECT_SELECT,
      },
    },
  });
  if (!plan) {
    return new Set();
  }
  return resolveRelatedProjectIdsFromPlan(plan);
};

const resolvePlanAccess = async (user, planId) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: planId },
    select: { id: true, companyId: true },
  });

  if (!plan) {
    return { allowed: false, permission: null, reason: "NOT_FOUND" };
  }

  if (!user?.companyId || plan.companyId !== user.companyId) {
    return { allowed: false, permission: null, reason: "FORBIDDEN" };
  }

  if (user.role === "COMPANY") {
    return { allowed: true, permission: PLAN_PERMISSION.EDIT, isOwner: true };
  }

  if (user.role === "MEMBER") {
    const access = await findActivePlanAccess(planId, user.id);
    if (!access) {
      return { allowed: false, permission: null, reason: "NO_GRANT" };
    }
    return {
      allowed: true,
      permission: access.permission,
      isOwner: false,
      grantedAt: access.createdAt,
    };
  }

  return { allowed: false, permission: null, reason: "FORBIDDEN" };
};

const assertPlanAccess = async (user, planId, required = PLAN_PERMISSION.VIEW) => {
  const resolved = await resolvePlanAccess(user, planId);

  if (!resolved.allowed) {
    if (resolved.reason === "NOT_FOUND") {
      createBadRequestError("برنامه استراتژی یافت نشد", 404);
    }
    createStrategyFlowError(
      "PLAN_ACCESS_DENIED",
      "به این برنامه استراتژی دسترسی ندارید",
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

const assertPlanAccessOnLoadedPlan = async (
  user,
  plan,
  required = PLAN_PERMISSION.VIEW,
) => {
  if (!plan?.id) {
    createBadRequestError("برنامه استراتژی یافت نشد", 404);
  }
  return assertPlanAccess(user, plan.id, required);
};

const assertCompanyStrategyRole = (user) => {
  if (user.role !== "COMPANY") {
    createStrategyFlowError(
      "STRATEGY_COMPANY_ONLY",
      "این عملیات فقط برای مدیر شرکت مجاز است",
      403,
    );
  }
};

const formatAccessForResponse = async (user, planId) => {
  const resolved = await resolvePlanAccess(user, planId);
  if (!resolved.allowed) {
    return null;
  }
  return {
    permission: resolved.permission,
    isOwner: Boolean(resolved.isOwner),
  };
};

const hasLegacyProjectAccess = async (user, projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      companyId: true,
      creatorId: true,
      accesses: { select: { userId: true } },
    },
  });

  if (!project || user.companyId !== project.companyId) {
    return false;
  }

  if (user.role === "COMPANY") {
    return true;
  }

  if (user.role === "MEMBER") {
    if (project.creatorId === user.id) {
      return true;
    }
    return project.accesses.some((access) => access.userId === user.id);
  }

  return false;
};

const canAccessProject = async (user, projectId) => {
  if (await hasLegacyProjectAccess(user, projectId)) {
    return true;
  }

  if (user.role !== "MEMBER" || !user.companyId) {
    return false;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, companyId: true },
  });

  if (!project || project.companyId !== user.companyId) {
    return false;
  }

  const plans = await prisma.strategyPlan.findMany({
    where: {
      companyId: user.companyId,
      status: { not: "ARCHIVED" },
    },
    select: { id: true },
  });

  for (const plan of plans) {
    const relatedIds = await resolveRelatedProjectIds(plan.id);
    if (!relatedIds.has(projectId)) {
      continue;
    }
    const access = await resolvePlanAccess(user, plan.id);
    if (access.allowed) {
      return true;
    }
  }

  return false;
};

const assertProjectAccessForLineage = async (user, projectId) => {
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    createStrategyFlowError(
      "PROJECT_ACCESS_DENIED",
      "به این پروژه دسترسی ندارید",
      403,
    );
  }
};

module.exports = {
  PLAN_PERMISSION,
  resolvePlanAccess,
  assertPlanAccess,
  assertPlanAccessOnLoadedPlan,
  assertCompanyStrategyRole,
  formatAccessForResponse,
  resolveRelatedProjectIds,
  resolveRelatedProjectIdsFromPlan,
  canAccessProject,
  assertProjectAccessForLineage,
  findActivePlanAccess,
};
