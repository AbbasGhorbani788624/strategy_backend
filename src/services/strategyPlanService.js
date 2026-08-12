const axios = require("axios");
const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const { Prisma } = require("@prisma/client");
const {
  buildMockStrategyAiResponse,
  isStrategyAiMockEnabled,
} = require("../mocks/strategyAiMock");
const {
  syncBscMeasuresFromKpiTable,
  syncOkrMeasuresFromTable,
  ensureMeasuresSyncedForPlan,
  normalizeBscKpiTable,
  normalizeOkrTable,
  countBscKpisInTable,
  countOkrKeyResultsInTable,
} = require("./strategyMeasureSyncService");
const { formatMeasureListItem } = require("./strategyMonitoringService");
const {
  buildActivePlanWhere,
  resolveContinueAction,
  resolveStageInfo,
  buildResumeMessage,
  assertPlanState,
  createStrategyFlowError,
} = require("../utils/strategyPlanResume");
const {
  parseListQuery,
  buildPaginationMeta,
  buildProjectTitleSearchFilter,
} = require("../utils/listQueryUtils");

const COMPANY_PROFILE_INCLUDE = {
  basicInfo: true,
  managers: true,
  revenueCenters: true,
  shareholders: true,
  organizationUnits: true,
  licenseCertificates: true,
  memberships: true,
  productServices: true,
  markets: true,
  keyCustomers: true,
  balanceSheets: true,
  incomeStatements: true,
  keySuppliers: true,
  rawMaterials: true,
  resourceCapabilities: true,
};

const toPlainJson = (value) => {
  if (value === null || value === undefined) return value;

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainJson(item));
  }

  if (typeof value === "object") {
    if (typeof value.toNumber === "function" && value.constructor?.name === "Decimal") {
      return value.toNumber();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, toPlainJson(nested)]),
    );
  }

  return value;
};

const buildCompanyProfile = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: COMPANY_PROFILE_INCLUDE,
  });

  if (!company) {
    createBadRequestError("شرکت مربوط به پروژه یافت نشد", 404);
  }

  return toPlainJson({
    basicInfo: company.basicInfo || {},
    managers: company.managers || [],
    revenueCenters: company.revenueCenters || [],
    shareholders: company.shareholders || [],
    organizationUnits: company.organizationUnits || [],
    licenseCertificates: company.licenseCertificates || [],
    memberships: company.memberships || [],
    productServices: company.productServices || [],
    markets: company.markets || [],
    keyCustomers: company.keyCustomers || [],
    balanceSheets: company.balanceSheets || [],
    incomeStatements: company.incomeStatements || [],
    keySuppliers: company.keySuppliers || [],
    rawMaterials: company.rawMaterials || [],
    resourceCapabilities: company.resourceCapabilities || [],
  });
};

const fetchProjectGoals = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      mode: true,
      goals: {
        select: {
          goal: {
            select: { id: true, title: true },
          },
        },
      },
      multiGoals: {
        select: {
          goal: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!project) {
    return [];
  }

  const projectGoals =
    project.mode === "SINGLE" ? project.goals : project.multiGoals;

  return projectGoals
    .map((item) => item.goal)
    .filter((goal) => goal?.title)
    .map((goal) => ({
      id: goal.id,
      title: goal.title,
    }));
};

const assertProjectAccess = (project, user) => {
  if (!project.companyId) {
    createBadRequestError("پروژه به هیچ شرکتی متصل نیست", 400);
  }

  if (!user.companyId || project.companyId !== user.companyId) {
    createBadRequestError(
      "شما اجازه استفاده از پروژه متعلق به شرکت دیگر را ندارید",
      403,
    );
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

const getInitialState = (framework) => {
  if (framework === "BSC") return "MAP_GENERATION";
  if (framework === "OKR") return "TABLE_GENERATION";
  createBadRequestError("framework نامعتبر است", 400);
};

const getNextStateAfterGeneration = (framework) => {
  if (framework === "BSC") return "MAP_VALIDATION";
  if (framework === "OKR") return "TABLE_VALIDATION";
  createBadRequestError("framework نامعتبر است", 400);
};

const buildAiPayload = ({
  framework,
  state,
  strategyText,
  companyProfile,
  goals = [],
}) => ({
  framework,
  state,
  strategy: strategyText,
  company_profile: companyProfile,
  goals,
});

const buildMapValidationPayload = ({
  strategyText,
  companyProfile,
  goals = [],
  initialMap,
  editedMap,
}) => ({
  framework: "BSC",
  state: "MAP_VALIDATION",
  strategy: strategyText,
  company_profile: companyProfile,
  goals,
  initial_map: initialMap,
  edited_map: editedMap,
});

const getNextStateAfterMapValidation = () => "MAP_VALIDATION";

const getNextStateAfterKpiGeneration = () => "KPI_VALIDATION";

const buildKpiGenerationPayload = ({
  strategyText,
  companyProfile,
  goals = [],
  approvedMap,
}) => ({
  framework: "BSC",
  state: "KPI_GENERATION",
  strategy: strategyText,
  company_profile: companyProfile,
  goals,
  approved_map: approvedMap,
});

const buildKpiValidationPayload = ({
  strategyText,
  companyProfile,
  goals = [],
  initialMap,
  editedMap,
}) => ({
  framework: "BSC",
  state: "KPI_VALIDATION",
  strategy: strategyText,
  company_profile: companyProfile,
  goals,
  initial_map: initialMap,
  edited_map: editedMap,
});

const buildTableValidationPayload = ({
  strategyText,
  companyProfile,
  goals = [],
  initialTable,
  editedTable,
}) => ({
  framework: "OKR",
  state: "TABLE_VALIDATION",
  strategy: strategyText,
  company_profile: companyProfile,
  goals,
  initial_table: initialTable,
  edited_table: editedTable,
});

const getNextStateAfterKpiValidation = () => "KPI_VALIDATION";

const getNextStateAfterTableValidation = () => "TABLE_VALIDATION";

const getNextStateAfterMeasuresApproval = () => "READY_FOR_MONITORING";

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

const formatStrategyPlanListItem = (plan) => {
  const mapApproval = plan.approvals?.find((item) => item.type === "MAP");
  const measuresApproval = plan.approvals?.find(
    (item) => item.type === "MEASURES",
  );
  const latestMap = plan.maps?.[0] || null;

  return {
    id: plan.id,
    projectId: plan.projectId,
    projectTitle: plan.project?.title || null,
    framework: plan.framework,
    state: plan.state,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    mapStatus: latestMap?.status || null,
    mapApprovedAt: mapApproval?.approvedAt || latestMap?.approvedAt || null,
    measuresApprovedAt: measuresApproval?.approvedAt || null,
    hasMapApproval: Boolean(mapApproval),
    hasMeasuresApproval: Boolean(measuresApproval),
  };
};

const listStrategyPlanInclude = {
  project: {
    select: {
      id: true,
      title: true,
      creatorId: true,
    },
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
  measures: {
    orderBy: { createdAt: "asc" },
  },
};

const fetchMeasuresForPlan = async (strategyPlanId) => {
  await ensureMeasuresSyncedForPlan(strategyPlanId);

  const measures = await prisma.strategyMeasure.findMany({
    where: { strategyPlanId },
    orderBy: { createdAt: "asc" },
  });

  return measures.map(formatMeasureListItem);
};

const loadStrategyPlanForUser = async (strategyPlanId, user, { includeAiRuns = false } = {}) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: strategyPlanId },
    include: {
      project: {
        select: {
          id: true,
          creatorId: true,
          companyId: true,
          accesses: {
            select: { userId: true },
          },
        },
      },
      maps: {
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      ...(includeAiRuns
        ? {
            aiRuns: {
              where: { success: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          }
        : {}),
    },
  });

  if (!plan) {
    createBadRequestError("برنامه استراتژی یافت نشد", 404);
  }

  assertStrategyPlanAccess(plan, user);
  return plan;
};

const recordFailedAiRun = async ({ aiRunId, strategyPlanId, error, nextPlanState }) => {
  await prisma.$transaction([
    prisma.strategyAiRun.update({
      where: { id: aiRunId },
      data: {
        success: false,
        errorMessage: error.message,
        finishedAt: new Date(),
      },
    }),
    prisma.strategyPlan.update({
      where: { id: strategyPlanId },
      data: {
        state: nextPlanState,
        status: "IN_PROGRESS",
      },
    }),
  ]);
};

const callStrategyAi = async (payload) => {
  if (isStrategyAiMockEnabled()) {
    console.info("[Strategy AI Mock]", payload.framework, payload.state);
    return buildMockStrategyAiResponse(payload);
  }

  const url = process.env.STRATEGY_AI_URL;

  if (!url) {
    createBadRequestError(
      "آدرس سرویس هوش مصنوعی استراتژی تنظیم نشده است (STRATEGY_AI_URL). برای تست، STRATEGY_AI_MOCK=true را فعال کنید.",
      500,
    );
  }

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 180000,
    });

    return response.data;
  } catch (error) {
    console.error("Strategy AI API request failed", {
      url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    const apiMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === "string" ? error.response.data : null);

    const failure = new Error(
      apiMessage || error.message || "خطا در ارتباط با سرویس هوش مصنوعی استراتژی",
    );
    failure.statusCode = error.response?.status || 502;
    failure.cause = error;
    throw failure;
  }
};

const extractGeneratedArtifact = (framework, aiResponse, { phase } = {}) => {
  if (!aiResponse || typeof aiResponse !== "object") {
    return aiResponse;
  }

  if (framework === "BSC") {
    if (phase === "MAP_VALIDATION") {
      return (
        aiResponse.map ??
        aiResponse.validated_map ??
        aiResponse.final_map ??
        aiResponse.data?.map ??
        aiResponse.data?.validated_map ??
        aiResponse
      );
    }

    if (phase === "KPI_GENERATION" || phase === "KPI_VALIDATION") {
      return (
        aiResponse.kpis ??
        aiResponse.kpi_table ??
        aiResponse.kpiTable ??
        aiResponse.measures ??
        aiResponse.table ??
        aiResponse.validated_kpis ??
        aiResponse.data?.kpis ??
        aiResponse.data?.kpi_table ??
        aiResponse.data?.table ??
        aiResponse
      );
    }

    return aiResponse.map ?? aiResponse.data?.map ?? aiResponse;
  }

  if (framework === "OKR") {
    if (phase === "TABLE_GENERATION" || phase === "TABLE_VALIDATION") {
      return (
        aiResponse.kpis ??
        aiResponse.kpi_table ??
        aiResponse.kpiTable ??
        aiResponse.measures ??
        aiResponse.table ??
        aiResponse.validated_kpis ??
        aiResponse.validated_table ??
        aiResponse.data?.kpis ??
        aiResponse.data?.kpi_table ??
        aiResponse.data?.table ??
        aiResponse.data?.validated_table ??
        aiResponse
      );
    }

    return (
      aiResponse.kpi_table ??
      aiResponse.kpiTable ??
      aiResponse.table ??
      aiResponse.data?.kpi_table ??
      aiResponse.data?.table ??
      aiResponse
    );
  }

  if (phase === "TABLE_VALIDATION") {
    return (
      aiResponse.table ??
      aiResponse.validated_table ??
      aiResponse.data?.table ??
      aiResponse.data?.validated_table ??
      aiResponse
    );
  }

  return aiResponse.table ?? aiResponse.data?.table ?? aiResponse;
};

const buildBscMapResponse = (plan, map) => {
  if (!map) {
    return {
      map: null,
    };
  }

  const currentMap =
    map.finalData ?? map.editedData ?? map.initialData ?? null;

  return {
    map: currentMap,
    initialMap: map.initialData ?? null,
    editedMap: map.editedData ?? null,
    finalMap: map.finalData ?? null,
    mapMeta: {
      id: map.id,
      version: map.version,
      status: map.status,
      approvedAt: map.approvedAt,
    },
  };
};

const resolveKpiTableFromAiRuns = (aiRuns, { preferApproved = false } = {}) => {
  if (preferApproved) {
    const approvedRun = aiRuns?.find(
      (run) =>
        run.state === "KPI_VALIDATION" &&
        run.requestPayload?.approved === true &&
        run.responsePayload,
    );
    if (approvedRun?.responsePayload) {
      return extractGeneratedArtifact("BSC", approvedRun.responsePayload, {
        phase: "KPI_VALIDATION",
      });
    }
  }

  const validationRun = aiRuns?.find((run) => run.state === "KPI_VALIDATION");
  if (validationRun?.responsePayload) {
    return extractGeneratedArtifact("BSC", validationRun.responsePayload, {
      phase: "KPI_VALIDATION",
    });
  }

  const generationRun = aiRuns?.find((run) => run.state === "KPI_GENERATION");
  if (generationRun?.responsePayload) {
    return extractGeneratedArtifact("BSC", generationRun.responsePayload, {
      phase: "KPI_GENERATION",
    });
  }

  return null;
};

const resolveOkrTableFromAiRuns = (aiRuns, { preferApproved = false } = {}) => {
  if (preferApproved) {
    const approvedRun = aiRuns?.find(
      (run) =>
        run.state === "TABLE_VALIDATION" &&
        run.requestPayload?.approved === true &&
        run.responsePayload,
    );
    if (approvedRun?.responsePayload) {
      return extractGeneratedArtifact("OKR", approvedRun.responsePayload, {
        phase: "TABLE_VALIDATION",
      });
    }
  }

  const validationRun = aiRuns?.find((run) => run.state === "TABLE_VALIDATION");
  if (validationRun?.responsePayload) {
    return extractGeneratedArtifact("OKR", validationRun.responsePayload, {
      phase: "TABLE_VALIDATION",
    });
  }

  const generationRun = aiRuns?.find((run) => run.state === "TABLE_GENERATION");
  if (generationRun?.responsePayload) {
    return extractGeneratedArtifact("OKR", generationRun.responsePayload, {
      phase: "TABLE_GENERATION",
    });
  }

  return null;
};

const resolveInitialKpiTableFromAiRuns = (aiRuns) => {
  const generationRun = aiRuns?.find((run) => run.state === "KPI_GENERATION");
  if (!generationRun?.responsePayload) {
    return null;
  }

  return extractGeneratedArtifact("BSC", generationRun.responsePayload, {
    phase: "KPI_GENERATION",
  });
};

const resolveInitialOkrTableFromAiRuns = (aiRuns) => {
  const generationRun = aiRuns?.find((run) => run.state === "TABLE_GENERATION");
  if (!generationRun?.responsePayload) {
    return null;
  }

  return extractGeneratedArtifact("OKR", generationRun.responsePayload, {
    phase: "TABLE_GENERATION",
  });
};

const buildBscKpiResponse = (aiRuns) => {
  const initialKpiTable = resolveInitialKpiTableFromAiRuns(aiRuns);
  const currentKpiTable = resolveKpiTableFromAiRuns(aiRuns);

  if (!currentKpiTable && !initialKpiTable) {
    return {};
  }

  const validationRun = aiRuns?.find((run) => run.state === "KPI_VALIDATION");
  const editedKpiTable =
    validationRun?.requestPayload?.edited_map ??
    validationRun?.requestPayload?.editedMap ??
    null;

  return {
    kpiTable: currentKpiTable,
    initialKpiTable,
    editedKpiTable,
  };
};

const buildOkrTableResponse = (aiRuns) => {
  const initialKpiTable = resolveInitialOkrTableFromAiRuns(aiRuns);
  const currentKpiTable = resolveOkrTableFromAiRuns(aiRuns);

  if (!currentKpiTable && !initialKpiTable) {
    return {};
  }

  const validationRun = aiRuns?.find((run) => run.state === "TABLE_VALIDATION");
  const editedKpiTable =
    validationRun?.requestPayload?.edited_table ??
    validationRun?.requestPayload?.editedTable ??
    validationRun?.requestPayload?.edited_kpi_table ??
    validationRun?.requestPayload?.editedKpiTable ??
    null;

  return {
    kpiTable: currentKpiTable,
    initialKpiTable,
    editedKpiTable,
    table: currentKpiTable,
    initialTable: initialKpiTable,
    editedTable: editedKpiTable,
  };
};

const formatStrategyPlan = (plan) => ({
  id: plan.id,
  projectId: plan.projectId,
  companyId: plan.companyId,
  framework: plan.framework,
  state: plan.state,
  status: plan.status,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

const activeStrategyPlanInclude = {
  project: {
    select: {
      id: true,
      title: true,
      creatorId: true,
    },
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

const findActiveStrategyPlan = async (user, { projectId, framework, companyId }) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);

  return prisma.strategyPlan.findFirst({
    where: {
      ...accessWhere,
      ...buildActivePlanWhere({ projectId, framework, companyId }),
    },
    include: activeStrategyPlanInclude,
    orderBy: { updatedAt: "desc" },
  });
};

const buildFullStrategyPlanPayload = async (plan) => {
  const hasMeasuresApproval = plan.approvals?.some(
    (approval) => approval.type === "MEASURES",
  );
  const continueAction = resolveContinueAction(plan.state);
  const { stage, stageLabel } = resolveStageInfo(plan.state, hasMeasuresApproval);

  const payload = {
    strategyPlan: formatStrategyPlan(plan),
    continueAction,
    stage,
    stageLabel,
    canCreateNew: false,
    hasMeasuresApproval,
  };

  if (plan.framework === "BSC") {
    const latestMap = plan.maps?.[0] || null;
    Object.assign(payload, buildBscMapResponse(plan, latestMap));
    Object.assign(payload, buildBscKpiResponse(plan.aiRuns || []));
  } else if (plan.framework === "OKR") {
    Object.assign(payload, buildOkrTableResponse(plan.aiRuns || []));
  }

  if (
    hasMeasuresApproval ||
    plan.state === "READY_FOR_MONITORING" ||
    plan.state === "MONITORING"
  ) {
    payload.measures = await fetchMeasuresForPlan(plan.id);
  }

  return payload;
};

const createStrategyPlanService = async (user, { projectId, framework }) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      companyId: true,
      creatorId: true,
      finalAnalysis: true,
      accesses: {
        select: { userId: true },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  assertProjectAccess(project, user);

  const existingPlan = await findActiveStrategyPlan(user, {
    projectId: project.id,
    framework,
    companyId: project.companyId,
  });

  if (existingPlan) {
    const payload = await buildFullStrategyPlanPayload(existingPlan);
    return {
      ...payload,
      existing: true,
      projectTitle: existingPlan.project?.title || null,
      message: buildResumeMessage(
        existingPlan.framework,
        payload.continueAction,
      ),
    };
  }

  const finalAnalysis = project.finalAnalysis?.trim();
  if (!finalAnalysis) {
    createBadRequestError(
      "تحلیل نهایی پروژه موجود نیست. ابتدا تحلیل نهایی را تکمیل کنید",
      400,
    );
  }

  const companyProfile = await buildCompanyProfile(project.companyId);
  const goals = await fetchProjectGoals(project.id);
  const initialState = getInitialState(framework);

  const strategyPlan = await prisma.strategyPlan.create({
    data: {
      projectId: project.id,
      companyId: project.companyId,
      framework,
      status: "IN_PROGRESS",
      state: initialState,
      strategyText: finalAnalysis,
      companyProfile,
    },
  });

  const requestPayload = buildAiPayload({
    framework,
    state: initialState,
    strategyText: finalAnalysis,
    companyProfile,
    goals,
  });

  const aiRun = await prisma.strategyAiRun.create({
    data: {
      strategyPlanId: strategyPlan.id,
      framework,
      state: initialState,
      requestPayload,
      success: false,
    },
  });

  let aiResponse;
  try {
    aiResponse = await callStrategyAi(requestPayload);
  } catch (error) {
    await recordFailedAiRun({
      aiRunId: aiRun.id,
      strategyPlanId: strategyPlan.id,
      error,
      nextPlanState: "FAILED",
    });

    throw error;
  }

  const nextState = getNextStateAfterGeneration(framework);
  const generatedArtifact = extractGeneratedArtifact(framework, aiResponse);
  const finishedAt = new Date();

  const [, updatedPlan, strategyMap] = await prisma.$transaction(async (tx) => {
    const updatedAiRun = await tx.strategyAiRun.update({
      where: { id: aiRun.id },
      data: {
        responsePayload: aiResponse ?? Prisma.JsonNull,
        success: true,
        finishedAt,
        errorMessage: null,
      },
    });

    const plan = await tx.strategyPlan.update({
      where: { id: strategyPlan.id },
      data: {
        state: nextState,
        status: "IN_PROGRESS",
      },
    });

    let map = null;
    if (framework === "BSC") {
      map = await tx.strategyMap.create({
        data: {
          strategyPlanId: strategyPlan.id,
          version: 1,
          status: "DRAFT",
          initialData: generatedArtifact ?? Prisma.JsonNull,
        },
      });
    }

    return [updatedAiRun, plan, map];
  });

  if (framework === "BSC") {
    return {
      existing: false,
      strategyPlan: formatStrategyPlan(updatedPlan),
      ...buildBscMapResponse(updatedPlan, strategyMap),
      map: strategyMap?.initialData ?? generatedArtifact,
      continueAction: resolveContinueAction(updatedPlan.state),
    };
  }

  return {
    existing: false,
    strategyPlan: formatStrategyPlan(updatedPlan),
    kpiTable: generatedArtifact,
    initialKpiTable: generatedArtifact,
    table: generatedArtifact,
    initialTable: generatedArtifact,
    continueAction: resolveContinueAction(updatedPlan.state),
  };
};

const getStrategyPlanByProjectService = async (user, projectId, framework) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      companyId: true,
      creatorId: true,
      accesses: {
        select: { userId: true },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  assertProjectAccess(project, user);

  const plan = await findActiveStrategyPlan(user, {
    projectId: project.id,
    framework,
    companyId: project.companyId,
  });

  if (!plan) {
    return {
      exists: false,
      canCreateNew: true,
    };
  }

  const payload = await buildFullStrategyPlanPayload(plan);

  return {
    exists: true,
    ...payload,
    projectTitle: project.title || null,
    message: buildResumeMessage(plan.framework, payload.continueAction),
  };
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

const validateBscMapService = async (user, strategyPlanId, editedMap) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user);

  if (plan.framework !== "BSC") {
    createBadRequestError(
      "اعتبارسنجی نقشه فقط برای framework نوع BSC مجاز است",
      400,
    );
  }

  assertPlanState(plan, ["MAP_VALIDATION"], "اعتبارسنجی نقشه");

  const strategyMap = plan.maps[0];
  if (!strategyMap) {
    createBadRequestError("نقشه استراتژی یافت نشد", 404);
  }

  if (!strategyMap.initialData) {
    createBadRequestError("نقشه اولیه AI موجود نیست", 400);
  }

  const companyProfile = plan.companyProfile || {};
  const goals = await fetchProjectGoals(plan.projectId);
  const requestPayload = buildMapValidationPayload({
    strategyText: plan.strategyText,
    companyProfile,
    goals,
    initialMap: strategyMap.initialData,
    editedMap,
  });

  await prisma.strategyMap.update({
    where: { id: strategyMap.id },
    data: {
      editedData: editedMap,
      status: "VALIDATING",
    },
  });

  const aiRun = await prisma.strategyAiRun.create({
    data: {
      strategyPlanId: plan.id,
      framework: "BSC",
      state: "MAP_VALIDATION",
      requestPayload,
      success: false,
    },
  });

  let aiResponse;
  try {
    aiResponse = await callStrategyAi(requestPayload);
  } catch (error) {
    await recordFailedAiRun({
      aiRunId: aiRun.id,
      strategyPlanId: plan.id,
      error,
      nextPlanState: "MAP_VALIDATION",
    });

    await prisma.strategyMap.update({
      where: { id: strategyMap.id },
      data: {
        status: "DRAFT",
      },
    });

    throw error;
  }

  const validatedMap = extractGeneratedArtifact("BSC", aiResponse, {
    phase: "MAP_VALIDATION",
  });
  const nextState = getNextStateAfterMapValidation();
  const finishedAt = new Date();

  const [, updatedPlan, updatedMap] = await prisma.$transaction(async (tx) => {
    const updatedAiRun = await tx.strategyAiRun.update({
      where: { id: aiRun.id },
      data: {
        responsePayload: aiResponse ?? Prisma.JsonNull,
        success: true,
        finishedAt,
        errorMessage: null,
      },
    });

    const updatedStrategyMap = await tx.strategyMap.update({
      where: { id: strategyMap.id },
      data: {
        finalData: validatedMap ?? Prisma.JsonNull,
        status: "DRAFT",
      },
    });

    const updatedStrategyPlan = await tx.strategyPlan.update({
      where: { id: plan.id },
      data: {
        state: nextState,
        status: "IN_PROGRESS",
      },
    });

    return [updatedAiRun, updatedStrategyPlan, updatedStrategyMap];
  });

  return {
    strategyPlan: formatStrategyPlan(updatedPlan),
    ...buildBscMapResponse(updatedPlan, updatedMap),
    map: validatedMap,
  };
};

const approveBscMapAndGenerateKpisService = async (
  user,
  strategyPlanId,
  approvedMap,
) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user);

  if (plan.framework !== "BSC") {
    createBadRequestError(
      "تایید نقشه و تولید KPI فقط برای framework نوع BSC مجاز است",
      400,
    );
  }

  assertPlanState(plan, ["MAP_VALIDATION"], "تایید نقشه");

  const strategyMap = plan.maps[0];
  if (!strategyMap) {
    createBadRequestError("نقشه استراتژی یافت نشد", 404);
  }

  const companyProfile = plan.companyProfile || {};
  const goals = await fetchProjectGoals(plan.projectId);
  const requestPayload = buildKpiGenerationPayload({
    strategyText: plan.strategyText,
    companyProfile,
    goals,
    approvedMap,
  });

  const approvedAt = new Date();

  await prisma.strategyMap.update({
    where: { id: strategyMap.id },
    data: {
      finalData: approvedMap,
      status: "APPROVED",
      approvedAt,
      approvedById: user.id,
    },
  });

  const aiRun = await prisma.strategyAiRun.create({
    data: {
      strategyPlanId: plan.id,
      framework: "BSC",
      state: "KPI_GENERATION",
      requestPayload,
      success: false,
    },
  });

  let aiResponse;
  try {
    aiResponse = await callStrategyAi(requestPayload);
  } catch (error) {
    await recordFailedAiRun({
      aiRunId: aiRun.id,
      strategyPlanId: plan.id,
      error,
      nextPlanState: "MAP_VALIDATION",
    });

    await prisma.strategyMap.update({
      where: { id: strategyMap.id },
      data: {
        status: "DRAFT",
        approvedAt: null,
        approvedById: null,
      },
    });

    throw error;
  }

  const kpiTable = extractGeneratedArtifact("BSC", aiResponse, {
    phase: "KPI_GENERATION",
  });
  const nextState = getNextStateAfterKpiGeneration();
  const finishedAt = new Date();

  const [, updatedPlan, updatedMap] = await prisma.$transaction(async (tx) => {
    const updatedAiRun = await tx.strategyAiRun.update({
      where: { id: aiRun.id },
      data: {
        responsePayload: aiResponse ?? Prisma.JsonNull,
        success: true,
        finishedAt,
        errorMessage: null,
      },
    });

    const updatedStrategyMap = await tx.strategyMap.findUnique({
      where: { id: strategyMap.id },
    });

    const updatedStrategyPlan = await tx.strategyPlan.update({
      where: { id: plan.id },
      data: {
        state: nextState,
        status: "IN_PROGRESS",
      },
    });

    await tx.strategyApproval.create({
      data: {
        strategyPlanId: plan.id,
        type: "MAP",
        version: strategyMap.version,
        approvedAt,
      },
    });

    return [updatedAiRun, updatedStrategyPlan, updatedStrategyMap];
  });

  return {
    strategyPlan: formatStrategyPlan(updatedPlan),
    ...buildBscMapResponse(updatedPlan, updatedMap),
    kpiTable,
  };
};

const validateBscKpisService = async (user, strategyPlanId, editedKpiTable) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user, {
    includeAiRuns: true,
  });

  if (plan.framework !== "BSC") {
    createBadRequestError(
      "اعتبارسنجی KPI فقط برای framework نوع BSC مجاز است",
      400,
    );
  }

  assertPlanState(plan, ["KPI_VALIDATION"], "اعتبارسنجی KPI");

  const initialKpiTable = resolveInitialKpiTableFromAiRuns(plan.aiRuns);
  if (!initialKpiTable) {
    createBadRequestError("جدول KPI اولیه AI موجود نیست", 400);
  }

  const companyProfile = plan.companyProfile || {};
  const goals = await fetchProjectGoals(plan.projectId);
  const requestPayload = buildKpiValidationPayload({
    strategyText: plan.strategyText,
    companyProfile,
    goals,
    initialMap: initialKpiTable,
    editedMap: editedKpiTable,
  });

  const aiRun = await prisma.strategyAiRun.create({
    data: {
      strategyPlanId: plan.id,
      framework: "BSC",
      state: "KPI_VALIDATION",
      requestPayload,
      success: false,
    },
  });

  let aiResponse;
  try {
    aiResponse = await callStrategyAi(requestPayload);
  } catch (error) {
    await recordFailedAiRun({
      aiRunId: aiRun.id,
      strategyPlanId: plan.id,
      error,
      nextPlanState: "KPI_VALIDATION",
    });

    throw error;
  }

  const validatedKpiTable = extractGeneratedArtifact("BSC", aiResponse, {
    phase: "KPI_VALIDATION",
  });
  const nextState = getNextStateAfterKpiValidation();
  const finishedAt = new Date();

  const [, updatedPlan] = await prisma.$transaction(async (tx) => {
    const updatedAiRun = await tx.strategyAiRun.update({
      where: { id: aiRun.id },
      data: {
        responsePayload: aiResponse ?? Prisma.JsonNull,
        success: true,
        finishedAt,
        errorMessage: null,
      },
    });

    const updatedStrategyPlan = await tx.strategyPlan.update({
      where: { id: plan.id },
      data: {
        state: nextState,
        status: "IN_PROGRESS",
      },
    });

    return [updatedAiRun, updatedStrategyPlan];
  });

  const latestMap = plan.maps[0] || null;

  return {
    strategyPlan: formatStrategyPlan(updatedPlan),
    ...buildBscMapResponse(updatedPlan, latestMap),
    kpiTable: validatedKpiTable,
    initialKpiTable: initialKpiTable,
    editedKpiTable: editedKpiTable,
  };
};

const validateOkrTableService = async (user, strategyPlanId, editedTable) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user, {
    includeAiRuns: true,
  });

  if (plan.framework !== "OKR") {
    createBadRequestError(
      "اعتبارسنجی جدول فقط برای framework نوع OKR مجاز است",
      400,
    );
  }

  assertPlanState(plan, ["TABLE_VALIDATION"], "اعتبارسنجی جدول");

  const initialTable = resolveInitialOkrTableFromAiRuns(plan.aiRuns);
  if (!initialTable) {
    createBadRequestError("جدول اولیه AI موجود نیست", 400);
  }

  const companyProfile = plan.companyProfile || {};
  const goals = await fetchProjectGoals(plan.projectId);
  const requestPayload = buildTableValidationPayload({
    strategyText: plan.strategyText,
    companyProfile,
    goals,
    initialTable,
    editedTable,
  });

  const aiRun = await prisma.strategyAiRun.create({
    data: {
      strategyPlanId: plan.id,
      framework: "OKR",
      state: "TABLE_VALIDATION",
      requestPayload,
      success: false,
    },
  });

  let aiResponse;
  try {
    aiResponse = await callStrategyAi(requestPayload);
  } catch (error) {
    await recordFailedAiRun({
      aiRunId: aiRun.id,
      strategyPlanId: plan.id,
      error,
      nextPlanState: "TABLE_VALIDATION",
    });

    throw error;
  }

  const validatedTable = extractGeneratedArtifact("OKR", aiResponse, {
    phase: "TABLE_VALIDATION",
  });
  const nextState = getNextStateAfterTableValidation();
  const finishedAt = new Date();

  const [, updatedPlan] = await prisma.$transaction(async (tx) => {
    const updatedAiRun = await tx.strategyAiRun.update({
      where: { id: aiRun.id },
      data: {
        responsePayload: aiResponse ?? Prisma.JsonNull,
        success: true,
        finishedAt,
        errorMessage: null,
      },
    });

    const updatedStrategyPlan = await tx.strategyPlan.update({
      where: { id: plan.id },
      data: {
        state: nextState,
        status: "IN_PROGRESS",
      },
    });

    return [updatedAiRun, updatedStrategyPlan];
  });

  return {
    strategyPlan: formatStrategyPlan(updatedPlan),
    kpiTable: validatedTable,
    initialKpiTable: initialTable,
    editedKpiTable: editedTable,
    table: validatedTable,
    initialTable,
    editedTable,
  };
};

const listPendingBscMapsService = async (user, query = {}) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);
  const { page, limit, skip, search } = parseListQuery(query);
  const framework = query.framework || "BSC";

  const where = {
    ...accessWhere,
    framework,
    state: { not: "FAILED" },
    NOT: {
      approvals: {
        some: { type: "MAP" },
      },
    },
    ...buildProjectTitleSearchFilter(search),
  };

  const [plans, totalItems] = await Promise.all([
    prisma.strategyPlan.findMany({
      where,
      include: listStrategyPlanInclude,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.strategyPlan.count({ where }),
  ]);

  const items = plans.map((plan) => {
    const item = formatStrategyPlanListItem(plan);
    const latestMap = plan.maps[0] || null;

    return {
      ...item,
      stage: "MAP",
      continueAction: "MAP_VALIDATION",
      map: latestMap
        ? latestMap.finalData ?? latestMap.editedData ?? latestMap.initialData
        : null,
    };
  });

  return {
    items,
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

const listPendingMeasuresService = async (user, query = {}) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);
  const { page, limit, skip, search } = parseListQuery(query);

  const where = {
    ...accessWhere,
    state: { not: "FAILED" },
    NOT: {
      approvals: {
        some: { type: "MEASURES" },
      },
    },
    OR: [
      {
        framework: "BSC",
        approvals: {
          some: { type: "MAP" },
        },
        state: {
          in: ["KPI_GENERATION", "KPI_VALIDATION"],
        },
      },
      {
        framework: "OKR",
        state: {
          in: ["TABLE_GENERATION", "TABLE_VALIDATION"],
        },
        aiRuns: {
          some: {
            state: "TABLE_GENERATION",
            success: true,
          },
        },
      },
    ],
    ...buildProjectTitleSearchFilter(search),
  };

  if (query.framework) {
    where.OR = where.OR.filter((clause) => clause.framework === query.framework);
  }

  const [plans, totalItems] = await Promise.all([
    prisma.strategyPlan.findMany({
      where,
      include: listStrategyPlanInclude,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.strategyPlan.count({ where }),
  ]);

  const items = plans.map((plan) => {
    const item = formatStrategyPlanListItem(plan);

    if (plan.framework === "BSC") {
      const latestMap = plan.maps[0] || null;
      return {
        ...item,
        stage: "MEASURES",
        continueAction: "KPI_VALIDATION",
        map: latestMap?.finalData ?? null,
        kpiTable: resolveKpiTableFromAiRuns(plan.aiRuns),
      };
    }

    return {
      ...item,
      stage: "MEASURES",
      continueAction: "TABLE_VALIDATION",
      kpiTable: resolveOkrTableFromAiRuns(plan.aiRuns),
      table: resolveOkrTableFromAiRuns(plan.aiRuns),
    };
  });

  return {
    items,
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

const listApprovedStrategyPlansService = async (user, query = {}) => {
  const accessWhere = buildStrategyPlanAccessWhere(user);
  const { page, limit, skip, search } = parseListQuery(query);

  const where = {
    ...accessWhere,
    approvals: {
      some: { type: "MEASURES" },
    },
    ...(query.framework ? { framework: query.framework } : {}),
    ...(query.state ? { state: query.state } : {}),
    ...buildProjectTitleSearchFilter(search),
  };

  const [plans, totalItems] = await Promise.all([
    prisma.strategyPlan.findMany({
      where,
      include: listStrategyPlanInclude,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.strategyPlan.count({ where }),
  ]);

  const items = await Promise.all(
    plans.map(async (plan) => {
      const item = formatStrategyPlanListItem(plan);
      const latestMap = plan.maps[0] || null;
      const continueAction =
        plan.state === "MONITORING" ? "MONITORING" : "READY_FOR_MONITORING";
      const { stage, stageLabel } =
        plan.state === "MONITORING"
          ? { stage: "MONITORING", stageLabel: "پایش" }
          : { stage: "APPROVED", stageLabel: "آماده پایش" };

      const baseItem = {
        ...item,
        stage,
        stageLabel,
        continueAction,
        measures: await fetchMeasuresForPlan(plan.id),
      };

      if (plan.framework === "BSC") {
        return {
          ...baseItem,
          map: latestMap?.finalData ?? null,
          kpiTable: resolveKpiTableFromAiRuns(plan.aiRuns, {
            preferApproved: true,
          }),
        };
      }

      return {
        ...baseItem,
        kpiTable: resolveOkrTableFromAiRuns(plan.aiRuns, {
          preferApproved: true,
        }),
        table: resolveOkrTableFromAiRuns(plan.aiRuns, { preferApproved: true }),
      };
    }),
  );

  return {
    items,
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

const approveBscKpisService = async (user, strategyPlanId, approvedKpiTable) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user);

  if (plan.framework !== "BSC") {
    createBadRequestError(
      "تایید KPI فقط برای framework نوع BSC مجاز است",
      400,
    );
  }

  assertPlanState(plan, ["KPI_VALIDATION"], "تایید KPI");

  const mapApproval = await prisma.strategyApproval.findFirst({
    where: {
      strategyPlanId: plan.id,
      type: "MAP",
    },
  });

  if (!mapApproval) {
    createBadRequestError("نقشه استراتژی هنوز تایید نشده است", 400);
  }

  const approvedAt = new Date();
  const nextState = getNextStateAfterMeasuresApproval();
  const normalizedKpiTable = normalizeBscKpiTable(approvedKpiTable);
  const expectedKpiCount = countBscKpisInTable(normalizedKpiTable);

  if (expectedKpiCount === 0) {
    createStrategyFlowError(
      "INVALID_KPI_TABLE",
      "جدول KPI خالی است یا ساختار approvedKpiTable نامعتبر است.",
      400,
    );
  }

  const updatedPlan = await prisma.$transaction(async (tx) => {
    await tx.strategyAiRun.create({
      data: {
        strategyPlanId: plan.id,
        framework: "BSC",
        state: "KPI_VALIDATION",
        requestPayload: {
          approved: true,
          approved_kpi_table: normalizedKpiTable,
        },
        responsePayload: normalizedKpiTable,
        success: true,
        finishedAt: approvedAt,
      },
    });

    await tx.strategyApproval.create({
      data: {
        strategyPlanId: plan.id,
        type: "MEASURES",
        version: 1,
        approvedAt,
      },
    });

    const syncedMeasures = await syncBscMeasuresFromKpiTable(
      tx,
      plan.id,
      normalizedKpiTable,
    );

    if (syncedMeasures.length === 0) {
      createStrategyFlowError(
        "MEASURES_SYNC_FAILED",
        "KPI وجود دارد ولی Measure ساخته نشد.",
        500,
      );
    }

    return tx.strategyPlan.update({
      where: { id: plan.id },
      data: {
        state: nextState,
        status: "APPROVED",
      },
    });
  });

  const latestMap = plan.maps[0] || null;
  const measures = await fetchMeasuresForPlan(plan.id);

  return {
    strategyPlan: formatStrategyPlan(updatedPlan),
    ...buildBscMapResponse(updatedPlan, latestMap),
    kpiTable: normalizedKpiTable,
    measures,
  };
};

const approveOkrTableService = async (user, strategyPlanId, approvedTable) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user);

  if (plan.framework !== "OKR") {
    createBadRequestError(
      "تایید جدول فقط برای framework نوع OKR مجاز است",
      400,
    );
  }

  assertPlanState(plan, ["TABLE_VALIDATION"], "تایید جدول");

  const approvedAt = new Date();
  const nextState = getNextStateAfterMeasuresApproval();
  const normalizedTable = normalizeOkrTable(approvedTable);
  const expectedKpiCount = countOkrKeyResultsInTable(normalizedTable);

  if (expectedKpiCount === 0) {
    createStrategyFlowError(
      "INVALID_KPI_TABLE",
      "جدول OKR خالی است یا ساختار approvedTable (kpiTable) نامعتبر است.",
      400,
    );
  }

  const updatedPlan = await prisma.$transaction(async (tx) => {
    await tx.strategyAiRun.create({
      data: {
        strategyPlanId: plan.id,
        framework: "OKR",
        state: "TABLE_VALIDATION",
        requestPayload: {
          approved: true,
          approved_table: normalizedTable,
        },
        responsePayload: normalizedTable,
        success: true,
        finishedAt: approvedAt,
      },
    });

    await tx.strategyApproval.create({
      data: {
        strategyPlanId: plan.id,
        type: "MEASURES",
        version: 1,
        approvedAt,
      },
    });

    const syncedMeasures = await syncOkrMeasuresFromTable(
      tx,
      plan.id,
      normalizedTable,
    );

    if (syncedMeasures.length === 0) {
      createStrategyFlowError(
        "MEASURES_SYNC_FAILED",
        "KPI وجود دارد ولی Measure ساخته نشد.",
        500,
      );
    }

    return tx.strategyPlan.update({
      where: { id: plan.id },
      data: {
        state: nextState,
        status: "APPROVED",
      },
    });
  });

  const measures = await fetchMeasuresForPlan(plan.id);

  return {
    strategyPlan: formatStrategyPlan(updatedPlan),
    kpiTable: normalizedTable,
    table: normalizedTable,
    measures,
  };
};

const syncStrategyPlanMeasuresService = async (user, strategyPlanId) => {
  const plan = await loadStrategyPlanForUser(strategyPlanId, user, {
    includeAiRuns: true,
  });

  const hasMeasuresApproval = await prisma.strategyApproval.findFirst({
    where: {
      strategyPlanId: plan.id,
      type: "MEASURES",
    },
  });

  if (!hasMeasuresApproval) {
    createBadRequestError("برنامه استراتژی هنوز تایید نهایی نشده است", 400);
  }

  await prisma.$transaction(async (tx) => {
    if (plan.framework === "BSC") {
      const kpiTable =
        normalizeBscKpiTable(
          resolveKpiTableFromAiRuns(plan.aiRuns, { preferApproved: true }),
        ) || [];

      if (countBscKpisInTable(kpiTable) === 0) {
        createBadRequestError("جدول KPI تاییدشده برای sync یافت نشد", 400);
      }

      await syncBscMeasuresFromKpiTable(tx, plan.id, kpiTable);
      return;
    }

    const table =
      normalizeOkrTable(
        resolveOkrTableFromAiRuns(plan.aiRuns, { preferApproved: true }),
      ) || [];

    if (countOkrKeyResultsInTable(table) === 0) {
      createBadRequestError("جدول OKR تاییدشده برای sync یافت نشد", 400);
    }

    await syncOkrMeasuresFromTable(tx, plan.id, table);
  });

  return fetchMeasuresForPlan(plan.id);
};

const getStrategyPlanService = async (strategyPlanId, user) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: strategyPlanId },
    include: {
      project: {
        select: {
          id: true,
          creatorId: true,
          companyId: true,
          accesses: {
            select: { userId: true },
          },
        },
      },
      maps: {
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      aiRuns: {
        where: { success: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      approvals: true,
    },
  });

  if (!plan) {
    createBadRequestError("برنامه استراتژی یافت نشد", 404);
  }

  assertStrategyPlanAccess(plan, user);

  const hasMeasuresApproval = plan.approvals?.some(
    (approval) => approval.type === "MEASURES",
  );
  const continueAction = resolveContinueAction(plan.state);
  const { stage, stageLabel } = resolveStageInfo(plan.state, hasMeasuresApproval);

  const response = {
    strategyPlan: formatStrategyPlan(plan),
    continueAction,
    stage,
    stageLabel,
    hasMeasuresApproval,
  };

  if (plan.framework === "BSC") {
    const latestMap = plan.maps[0] || null;
    Object.assign(response, buildBscMapResponse(plan, latestMap));
    Object.assign(response, buildBscKpiResponse(plan.aiRuns));
  } else if (plan.framework === "OKR") {
    Object.assign(response, buildOkrTableResponse(plan.aiRuns));
  }

  if (
    hasMeasuresApproval ||
    plan.state === "READY_FOR_MONITORING" ||
    plan.state === "MONITORING"
  ) {
    response.measures = await fetchMeasuresForPlan(strategyPlanId);
  }

  return response;
};

module.exports = {
  createStrategyPlanService,
  getStrategyPlanByProjectService,
  getStrategyPlanService,
  validateBscMapService,
  approveBscMapAndGenerateKpisService,
  validateBscKpisService,
  validateOkrTableService,
  approveBscKpisService,
  approveOkrTableService,
  listPendingBscMapsService,
  listPendingMeasuresService,
  listApprovedStrategyPlansService,
  syncStrategyPlanMeasuresService,
  fetchMeasuresForPlan,
  resolveKpiTableFromAiRuns,
  resolveOkrTableFromAiRuns,
};
