const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  INACTIVE_STRATEGY_STATUSES,
  buildActivePlanWhere,
  buildActiveCompanyPlanWhere,
  createStrategyFlowError,
} = require("./strategyPlanResume");

const PROJECT_ACCESS_SELECT = {
  id: true,
  title: true,
  companyId: true,
  creatorId: true,
  accesses: {
    select: { userId: true },
  },
};

const ACTIVE_STRATEGY_PLAN_PROJECT_SELECT = {
  ...PROJECT_ACCESS_SELECT,
  mode: true,
  form: {
    select: { id: true, title: true, titleFa: true },
  },
  multiAnalysisForm: {
    select: { id: true, title: true, titleFa: true },
  },
  selectedSourceProjects: {
    select: {
      sourceProject: {
        select: { id: true, title: true },
      },
    },
  },
};

const formatProjectAnalysisMeta = (project) => {
  const analysis = project.form || project.multiAnalysisForm;

  return {
    analysisTitle: analysis?.title ?? null,
    analysisTitleFa: analysis?.titleFa ?? null,
  };
};

const formatStrategyPlanProjectRefs = (project) => {
  if (!project) {
    return { sourceProject: null, inputProjects: [] };
  }

  return {
    sourceProject: {
      id: project.id,
      title: project.title,
      ...formatProjectAnalysisMeta(project),
    },
    inputProjects:
      project.mode === "MULTI"
        ? (project.selectedSourceProjects ?? []).map((link) => ({
            id: link.sourceProject.id,
            title: link.sourceProject.title,
          }))
        : [],
  };
};

const ACTIVE_STRATEGY_PLAN_INCLUDE = {
  project: {
    select: ACTIVE_STRATEGY_PLAN_PROJECT_SELECT,
  },
  maps: {
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    take: 1,
  },
  approvals: {
    orderBy: { approvedAt: "desc" },
  },
  aiRuns: {
    where: { success: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  },
};

const buildStrategyPlanAccessWhere = (user) => {
  if (!user.companyId) {
    createBadRequestError("کاربر به شرکت متصل نیست", 403);
  }

  if (user.role === "COMPANY") {
    return { companyId: user.companyId };
  }

  if (user.role === "MEMBER") {
    return {
      companyId: user.companyId,
      planAccesses: {
        some: {
          userId: user.id,
          revokedAt: null,
        },
      },
    };
  }

  createBadRequestError("دسترسی غیرمجاز", 403);
};

const { assertProjectReadOnLoaded } = require("../services/projectAccessService");

const assertProjectAccess = (project, user) => {
  assertProjectReadOnLoaded(project, user);
};

const assertStrategyPlanAccess = async (plan, user, required = "VIEW") => {
  const {
    assertPlanAccessOnLoadedPlan,
    PLAN_PERMISSION,
  } = require("../services/strategyPlanAccessService");
  const level =
    required === PLAN_PERMISSION.EDIT ? PLAN_PERMISSION.EDIT : PLAN_PERMISSION.VIEW;
  await assertPlanAccessOnLoadedPlan(user, plan, level);
};

const loadProjectForUser = async (user, projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: PROJECT_ACCESS_SELECT,
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  assertProjectAccess(project, user);
  return project;
};

const findActiveStrategyPlanForCompany = async (
  user,
  framework,
  { include = ACTIVE_STRATEGY_PLAN_INCLUDE } = {},
) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);

  if (!framework) {
    createBadRequestError("framework الزامی است", 400);
  }

  if (framework === "OKR") {
    createStrategyFlowError(
      "AMBIGUOUS_OKR_PLAN",
      "برای OKR از GET /strategy-plans/workspace یا GET /strategy-plans/:planId استفاده کنید.",
      400,
    );
  }

  const plan = await prisma.strategyPlan.findFirst({
    where: {
      ...accessWhere,
      ...buildActiveCompanyPlanWhere({
        companyId: user.companyId,
      }),
      framework,
    },
    include,
    orderBy: { updatedAt: "desc" },
  });

  return plan;
};

const findActiveStrategyPlan = async (
  user,
  { projectId, framework, companyId },
  { include = null } = {},
) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);

  const plan = await prisma.strategyPlan.findFirst({
    where: {
      ...accessWhere,
      ...buildActivePlanWhere({ projectId, companyId }),
    },
    ...(include ? { include } : {}),
    orderBy: { updatedAt: "desc" },
  });

  if (plan && framework && plan.framework !== framework) {
    return null;
  }

  return plan;
};

const findStrategyPlanByProject = async (
  user,
  projectId,
  framework,
  { include = ACTIVE_STRATEGY_PLAN_INCLUDE } = {},
) => {
  if (!user.companyId) {
    createBadRequestError("کاربر به شرکت متصل نیست", 403);
  }

  const accessWhere = buildStrategyPlanAccessWhere(user);

  return prisma.strategyPlan.findFirst({
    where: {
      ...accessWhere,
      ...buildActivePlanWhere({
        projectId,
        companyId: user.companyId,
      }),
      framework,
    },
    include,
    orderBy: { updatedAt: "desc" },
  });
};

const loadActiveStrategyPlan = async (
  user,
  framework,
  { includeAiRuns = false, requirePlan = true } = {},
) => {
  const { assertCompanyStrategyRole } = require("../services/strategyPlanAccessService");
  assertCompanyStrategyRole(user);

  const include = {
    ...ACTIVE_STRATEGY_PLAN_INCLUDE,
    ...(includeAiRuns
      ? {
          aiRuns: {
            where: { success: true },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        }
      : {}),
  };

  const plan = await findActiveStrategyPlanForCompany(user, framework, {
    include,
  });

  if (!plan) {
    if (requirePlan) {
      createBadRequestError(
        "برنامه استراتژی فعالی برای این شرکت یافت نشد. ابتدا فرآیند برنامه‌ریزی را شروع کنید",
        404,
      );
    }
    return null;
  }

  await assertStrategyPlanAccess(plan, user);
  return plan;
};

const assertLegacyProjectMatchesActivePlan = (plan, projectId) => {
  if (plan.projectId !== projectId) {
    createBadRequestError(
      "این پروژه plan فعال شرکت نیست. از APIهای /active استفاده کنید",
      409,
    );
  }
};

const loadStrategyPlanByProject = async (
  user,
  projectId,
  framework,
  { includeAiRuns = false } = {},
) => {
  await loadProjectForUser(user, projectId);

  const include = {
    ...ACTIVE_STRATEGY_PLAN_INCLUDE,
    ...(includeAiRuns
      ? {
          aiRuns: {
            where: { success: true },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        }
      : {}),
  };

  const plan = await findStrategyPlanByProject(user, projectId, framework, {
    include,
  });

  if (!plan) {
    createBadRequestError(
      "برنامه استراتژی فعالی برای این پروژه یافت نشد",
      404,
    );
  }

  await assertStrategyPlanAccess(plan, user);
  return plan;
};

const parseMeasureIndex = (measureIndex) => {
  const index = Number(measureIndex);

  if (!Number.isInteger(index) || index < 0) {
    createBadRequestError("measureIndex باید عدد صحیح غیرمنفی باشد", 400);
  }

  return index;
};

const parsePeriodIndex = (periodIndex) => {
  const index = Number(periodIndex);

  if (!Number.isInteger(index) || index < 0) {
    createBadRequestError("periodIndex باید عدد صحیح غیرمنفی باشد", 400);
  }

  return index;
};

const deleteStrategyPlansForCompany = async (companyId) => {
  await prisma.strategyPlan.deleteMany({
    where: { companyId },
  });
};

const deleteStrategyPlansForSlot = async ({ companyId, framework, projectId }) => {
  if (framework === "BSC") {
    await prisma.strategyPlan.deleteMany({
      where: {
        companyId,
        framework: "BSC",
        status: { notIn: INACTIVE_STRATEGY_STATUSES },
      },
    });
    return;
  }

  if (framework === "OKR") {
    if (!projectId) {
      createBadRequestError("projectId برای حذف plan OKR الزامی است", 400);
    }
    await prisma.strategyPlan.deleteMany({
      where: {
        companyId,
        projectId,
        framework: "OKR",
        status: { notIn: INACTIVE_STRATEGY_STATUSES },
      },
    });
    return;
  }

  createBadRequestError("framework نامعتبر است", 400);
};

const resolveMeasureIdForPlan = async (
  user,
  strategyPlanId,
  measureIndexRaw,
  required = "VIEW",
) => {
  const measureIndex = parseMeasureIndex(measureIndexRaw);

  const { assertPlanAccess, PLAN_PERMISSION } = require("../services/strategyPlanAccessService");
  const level =
    required === PLAN_PERMISSION.EDIT ? PLAN_PERMISSION.EDIT : PLAN_PERMISSION.VIEW;
  await assertPlanAccess(user, strategyPlanId, level);

  const plan = await prisma.strategyPlan.findUnique({
    where: { id: strategyPlanId },
    include: {
      project: {
        select: {
          id: true,
          creatorId: true,
          companyId: true,
          accesses: { select: { userId: true } },
        },
      },
    },
  });

  if (!plan) {
    createBadRequestError("برنامه استراتژی یافت نشد", 404);
  }

  await assertStrategyPlanAccess(plan, user);

  const measures = await prisma.strategyMeasure.findMany({
    where: { strategyPlanId: plan.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (measureIndex >= measures.length) {
    createBadRequestError("measureIndex خارج از محدوده است", 404);
  }

  return {
    measureId: measures[measureIndex].id,
    measureIndex,
    strategyPlanId: plan.id,
  };
};

const resolveMeasureIdForActivePlan = async (
  user,
  framework,
  measureIndexRaw,
) => {
  const plan = await loadActiveStrategyPlan(user, framework);
  return resolveMeasureIdForPlan(user, plan.id, measureIndexRaw);
};

module.exports = {
  PROJECT_ACCESS_SELECT,
  ACTIVE_STRATEGY_PLAN_PROJECT_SELECT,
  formatStrategyPlanProjectRefs,
  ACTIVE_STRATEGY_PLAN_INCLUDE,
  buildStrategyPlanAccessWhere,
  assertProjectAccess,
  assertStrategyPlanAccess,
  assertLegacyProjectMatchesActivePlan,
  loadProjectForUser,
  findActiveStrategyPlanForCompany,
  findActiveStrategyPlan,
  findStrategyPlanByProject,
  loadActiveStrategyPlan,
  loadStrategyPlanByProject,
  parseMeasureIndex,
  parsePeriodIndex,
  deleteStrategyPlansForCompany,
  deleteStrategyPlansForSlot,
  resolveMeasureIdForPlan,
  resolveMeasureIdForActivePlan,
};
