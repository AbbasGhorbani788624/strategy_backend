const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  buildActivePlanWhere,
  buildActiveCompanyPlanWhere,
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
      project: {
        OR: [
          { creatorId: user.id },
          { accesses: { some: { userId: user.id } } },
        ],
      },
    };
  }

  createBadRequestError("دسترسی غیرمجاز", 403);
};

const assertProjectAccess = (project, user) => {
  if (!user.companyId || project.companyId !== user.companyId) {
    createBadRequestError("شما اجازه دسترسی به این پروژه را ندارید", 403);
  }

  if (user.role === "COMPANY") {
    return;
  }

  if (user.role === "MEMBER") {
    const isCreator = project.creatorId === user.id;
    const hasAccess = project.accesses?.some(
      (access) => access.userId === user.id,
    );

    if (!isCreator && !hasAccess) {
      createBadRequestError("شما به این پروژه دسترسی ندارید", 403);
    }
    return;
  }

  createBadRequestError("دسترسی غیرمجاز", 403);
};

const assertStrategyPlanAccess = (plan, user) => {
  if (!user.companyId || plan.companyId !== user.companyId) {
    createBadRequestError(
      "شما اجازه دسترسی به این برنامه استراتژی را ندارید",
      403,
    );
  }

  if (user.role === "COMPANY") {
    return;
  }

  if (user.role === "MEMBER") {
    const isCreator = plan.project?.creatorId === user.id;
    const hasAccess = plan.project?.accesses?.some(
      (access) => access.userId === user.id,
    );

    if (!isCreator && !hasAccess) {
      createBadRequestError("شما به این برنامه استراتژی دسترسی ندارید", 403);
    }
    return;
  }

  createBadRequestError("دسترسی غیرمجاز", 403);
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

  return prisma.strategyPlan.findFirst({
    where: {
      ...accessWhere,
      ...buildActiveCompanyPlanWhere({
        companyId: user.companyId,
        framework,
      }),
    },
    include,
    orderBy: { updatedAt: "desc" },
  });
};

const findActiveStrategyPlan = async (
  user,
  { projectId, framework, companyId },
  { include = null } = {},
) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);

  return prisma.strategyPlan.findFirst({
    where: {
      ...accessWhere,
      ...buildActivePlanWhere({ projectId, framework, companyId }),
    },
    ...(include ? { include } : {}),
    orderBy: { updatedAt: "desc" },
  });
};

const loadActiveStrategyPlan = async (
  user,
  framework,
  { includeAiRuns = false, requirePlan = true } = {},
) => {
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

  assertStrategyPlanAccess(plan, user);
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
  const plan = await loadActiveStrategyPlan(user, framework, { includeAiRuns });
  assertLegacyProjectMatchesActivePlan(plan, projectId);
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

const deleteStrategyPlansForCompanyFramework = async (companyId, framework) => {
  await prisma.strategyPlan.deleteMany({
    where: { companyId, framework },
  });
};

const resolveMeasureIdForActivePlan = async (
  user,
  framework,
  measureIndexRaw,
) => {
  const measureIndex = parseMeasureIndex(measureIndexRaw);
  const plan = await loadActiveStrategyPlan(user, framework);

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
  loadActiveStrategyPlan,
  loadStrategyPlanByProject,
  parseMeasureIndex,
  parsePeriodIndex,
  deleteStrategyPlansForCompanyFramework,
  resolveMeasureIdForActivePlan,
};
