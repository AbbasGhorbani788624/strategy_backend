const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const {
  deriveActionStatusFromProgress,
  enrichActionWithSchedule,
  calculateControlSummary,
  calculatePlanScheduleStatus,
  getPlanDateRange,
} = require("../utils/projectPlanScheduleUtils");
const {
  validateNoCircularDependencies,
  validatePrerequisiteOwnership,
  validateOrderValues,
} = require("../utils/projectPlanDependencyUtils");
const {
  shouldSeedSuggestedPlanActions,
  getMockSuggestedPlanActions,
} = require("../mocks/projectPlanMock");

const PLAN_INCLUDE = {
  project: {
    select: {
      id: true,
      title: true,
      companyId: true,
      status: true,
    },
  },
  actions: {
    orderBy: { order: "asc" },
    include: {
      executor: {
        select: {
          id: true,
          username: true,
          role: true,
          companyId: true,
        },
      },
      prerequisiteAction: {
        select: {
          id: true,
          title: true,
          order: true,
        },
      },
    },
  },
};

const ACTION_INCLUDE = {
  executor: {
    select: {
      id: true,
      username: true,
      role: true,
      companyId: true,
    },
  },
  prerequisiteAction: {
    select: {
      id: true,
      title: true,
      order: true,
    },
  },
  plan: {
    include: {
      project: {
        select: {
          id: true,
          companyId: true,
        },
      },
    },
  },
};

const assertCompanyManager = (user) => {
  if (!["COMPANY", "SUPER_ADMIN"].includes(user.role)) {
    createBadRequestError("دسترسی غیرمجاز", 403);
  }
};

const assertCompanyOwnership = (user, projectCompanyId) => {
  if (user.role === "SUPER_ADMIN") {
    return;
  }

  if (!user.companyId || user.companyId !== projectCompanyId) {
    createBadRequestError("دسترسی به این برنامه مجاز نیست", 403);
  }
};

const loadProjectForPlan = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      companyId: true,
      status: true,
      projectPlan: {
        select: { id: true },
      },
    },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  return project;
};

const loadPlanForUser = async (planId, user) => {
  const plan = await prisma.projectPlan.findUnique({
    where: { id: planId },
    include: PLAN_INCLUDE,
  });

  if (!plan) {
    createBadRequestError("برنامه پروژه یافت نشد", 404);
  }

  assertCompanyOwnership(user, plan.project.companyId);
  return plan;
};

const loadActionForUser = async (actionId, user) => {
  const action = await prisma.projectPlanAction.findUnique({
    where: { id: actionId },
    include: ACTION_INCLUDE,
  });

  if (!action) {
    createBadRequestError("اقدام یافت نشد", 404);
  }

  assertCompanyOwnership(user, action.plan.project.companyId);
  return action;
};

const validateExecutor = async (executorId, projectCompanyId) => {
  if (!executorId) {
    return null;
  }

  const executor = await prisma.user.findUnique({
    where: { id: executorId },
    select: {
      id: true,
      role: true,
      companyId: true,
      username: true,
    },
  });

  if (!executor) {
    createBadRequestError("مجری انتخاب‌شده یافت نشد", 400);
  }

  if (executor.role !== "MEMBER") {
    createBadRequestError("مجری باید عضو (MEMBER) باشد", 400);
  }

  if (executor.companyId !== projectCompanyId) {
    createBadRequestError("مجری باید متعلق به همان شرکت باشد", 400);
  }

  return executor;
};

const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    createBadRequestError("تاریخ شروع یا پایان معتبر نیست", 400);
  }

  if (end < start) {
    createBadRequestError("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد", 400);
  }
};

const seedSuggestedPlanActions = async (planId, project, tx = prisma) => {
  const suggestions = getMockSuggestedPlanActions(project);

  if (!suggestions.length) {
    return;
  }

  await tx.projectPlanAction.createMany({
    data: suggestions.map((action, index) => ({
      planId,
      title: action.title,
      description: action.description?.trim() || null,
      startDate: null,
      endDate: null,
      executorId: null,
      order: index + 1,
      prerequisiteActionId: null,
    })),
  });
};

const formatActionResponse = (action, planStatus, now = new Date()) => {
  const base = {
    id: action.id,
    order: action.order,
    title: action.title,
    startDate: action.startDate,
    endDate: action.endDate,
    executor: action.executor,
    executorId: action.executorId,
    prerequisiteActionId: action.prerequisiteActionId,
    prerequisiteAction: action.prerequisiteAction,
  };

  if (planStatus === "DRAFT") {
    return base;
  }

  const enriched = enrichActionWithSchedule(
    {
      ...base,
      description: action.description,
      progress: action.progress,
      status: action.status,
      previouslyCompleted: (action.progress ?? 0) >= 100,
      completedAt: action.completedAt,
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
    },
    now,
  );

  return enriched;
};

const formatPlanResponse = (plan, now = new Date()) => {
  const actions = plan.actions.map((action) =>
    formatActionResponse(action, plan.status, now),
  );

  const summary = calculateControlSummary(plan.actions, now);
  const dateRange = getPlanDateRange(plan.actions);

  return {
    id: plan.id,
    projectId: plan.projectId,
    status: plan.status,
    lockedAt: plan.lockedAt,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    project: plan.project,
    actions,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    overallProgress: summary.overallProgress,
    expectedOverallProgress: summary.expectedOverallProgress,
    scheduleStatus: calculatePlanScheduleStatus(plan.actions, now),
    totalActions: summary.totalActions,
    completedActions: summary.completedActions,
    delayedActions: summary.delayedActions,
    atRiskActions: summary.atRiskActions,
    controlSummary: summary,
  };
};

const formatPlanListItem = (plan, now = new Date()) => {
  const summary = calculateControlSummary(plan.actions, now);
  const dateRange = getPlanDateRange(plan.actions);

  return {
    id: plan.id,
    projectId: plan.projectId,
    planStatus: plan.status,
    project: plan.project,
    overallProgress: summary.overallProgress,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    totalActions: summary.totalActions,
    completedActions: summary.completedActions,
    delayedActions: summary.delayedActions,
    scheduleStatus: calculatePlanScheduleStatus(plan.actions, now),
  };
};

const assertDraftPlan = (plan) => {
  if (plan.status !== "DRAFT") {
    createBadRequestError(
      "تغییر ساختار برنامه فقط در وضعیت پیش‌نویس مجاز است",
      400,
    );
  }
};

const assertPlanNotCompleted = (plan) => {
  if (plan.status === "COMPLETED") {
    createBadRequestError("برنامه تکمیل‌شده قابل ویرایش نیست", 400);
  }
};

const assertPlanAllowsProgressUpdates = (plan) => {
  assertPlanNotCompleted(plan);

  if (plan.status === "DRAFT") {
    createBadRequestError(
      "به‌روزرسانی پیشرفت پس از قفل شدن برنامه مجاز است",
      400,
    );
  }

  if (!["LOCKED", "IN_PROGRESS"].includes(plan.status)) {
    createBadRequestError(
      "به‌روزرسانی پیشرفت در وضعیت فعلی برنامه مجاز نیست",
      400,
    );
  }
};

const assertPlanAllowsDescriptionUpdates = (plan) => {
  assertPlanNotCompleted(plan);

  if (plan.status === "DRAFT") {
    createBadRequestError(
      "ویرایش توضیحات فقط پس از قفل شدن برنامه مجاز است",
      400,
    );
  }

  if (!["LOCKED", "IN_PROGRESS"].includes(plan.status)) {
    createBadRequestError(
      "ویرایش توضیحات در وضعیت فعلی برنامه مجاز نیست",
      400,
    );
  }
};

const syncPlanStatusFromActions = async (planId, tx = prisma) => {
  const actions = await tx.projectPlanAction.findMany({
    where: { planId },
    select: {
      progress: true,
    },
  });

  if (!actions.length) {
    return;
  }

  const plan = await tx.projectPlan.findUnique({
    where: { id: planId },
    select: { status: true },
  });

  if (!plan || plan.status === "DRAFT") {
    return;
  }

  const allCompleted = actions.every((action) => (action.progress ?? 0) >= 100);

  if (allCompleted) {
    await tx.projectPlan.update({
      where: { id: planId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  if (plan.status === "COMPLETED") {
    await tx.projectPlan.update({
      where: { id: planId },
      data: { status: "IN_PROGRESS" },
    });
    return;
  }

  if (plan.status === "LOCKED") {
    await tx.projectPlan.update({
      where: { id: planId },
      data: { status: "IN_PROGRESS" },
    });
  }
};

const createProjectPlan = async (user, projectId) => {
  assertCompanyManager(user);

  const project = await loadProjectForPlan(projectId);
  assertCompanyOwnership(user, project.companyId);

  if (project.projectPlan) {
    createBadRequestError("برنامه پروژه از قبل وجود دارد", 400);
  }

  const plan = await prisma.$transaction(async (tx) => {
    const createdPlan = await tx.projectPlan.create({
      data: {
        projectId,
      },
    });

    if (shouldSeedSuggestedPlanActions()) {
      await seedSuggestedPlanActions(createdPlan.id, project, tx);
    }

    return tx.projectPlan.findUnique({
      where: { id: createdPlan.id },
      include: PLAN_INCLUDE,
    });
  });

  return formatPlanResponse(plan);
};

const getProjectPlanByProject = async (user, projectId) => {
  assertCompanyManager(user);

  const project = await loadProjectForPlan(projectId);
  assertCompanyOwnership(user, project.companyId);

  const plan = await prisma.projectPlan.findUnique({
    where: { projectId },
    include: PLAN_INCLUDE,
  });

  if (!plan) {
    createBadRequestError("برنامه پروژه یافت نشد", 404);
  }

  return formatPlanResponse(plan);
};

const getProjectPlanDetails = async (user, planId) => {
  assertCompanyManager(user);
  const plan = await loadPlanForUser(planId, user);
  return formatPlanResponse(plan);
};

const listProjectPlans = async (user, query) => {
  assertCompanyManager(user);

  const {
    page = 1,
    limit = 10,
    search,
    status,
    executorId,
    scheduleStatus,
    startDate,
    endDate,
  } = query;

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

  const actionFilters = {};

  if (executorId) {
    actionFilters.executorId = executorId;
  }

  if (startDate) {
    actionFilters.startDate = { gte: new Date(startDate) };
  }

  if (endDate) {
    actionFilters.endDate = { lte: new Date(endDate) };
  }

  const where = {
    project: {
      ...(user.role === "COMPANY" ? { companyId: user.companyId } : {}),
      ...(search
        ? {
            title: {
              contains: search,
            },
          }
        : {}),
    },
    ...(status ? { status } : {}),
    ...(Object.keys(actionFilters).length
      ? {
          actions: {
            some: actionFilters,
          },
        }
      : {}),
  };

  const plans = await prisma.projectPlan.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          title: true,
          companyId: true,
        },
      },
      actions: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          progress: true,
          status: true,
          completedAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  const now = new Date();
  let formatted = plans.map((plan) => formatPlanListItem(plan, now));

  if (scheduleStatus) {
    formatted = formatted.filter((plan) => plan.scheduleStatus === scheduleStatus);
  }

  const totalItems = formatted.length;
  const skip = (parsedPage - 1) * parsedLimit;
  const paginated = formatted.slice(skip, skip + parsedLimit);

  return {
    plans: paginated,
    pagination: {
      totalItems,
      currentPage: parsedPage,
      totalPages: totalItems > 0 ? Math.ceil(totalItems / parsedLimit) : 0,
      limit: parsedLimit,
    },
  };
};

const getNextActionOrder = async (planId, tx = prisma) => {
  const maxOrder = await tx.projectPlanAction.aggregate({
    where: { planId },
    _max: { order: true },
  });

  return (maxOrder._max.order || 0) + 1;
};

const createPlanAction = async (user, planId, payload) => {
  assertCompanyManager(user);

  const plan = await loadPlanForUser(planId, user);
  assertDraftPlan(plan);
  assertPlanNotCompleted(plan);

  const {
    title,
    description,
    startDate,
    endDate,
    executorId,
    order,
    prerequisiteActionId,
  } = payload;

  if (!title?.trim()) {
    createBadRequestError("عنوان اقدام الزامی است", 400);
  }

  if (description !== undefined && description !== null && String(description).trim()) {
    createBadRequestError(
      "ویرایش توضیحات فقط پس از قفل شدن برنامه مجاز است",
      400,
    );
  }

  validateDateRange(startDate, endDate);
  if (executorId) {
    await validateExecutor(executorId, plan.project.companyId);
  }

  if (prerequisiteActionId) {
    validatePrerequisiteOwnership(
      prerequisiteActionId,
      planId,
      plan.actions,
    );
  }

  const actionOrder =
    order !== undefined ? order : await getNextActionOrder(planId);

  const action = await prisma.projectPlanAction.create({
    data: {
      planId,
      title: title.trim(),
      description: null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      executorId: executorId || null,
      order: actionOrder,
      prerequisiteActionId: prerequisiteActionId || null,
    },
    include: ACTION_INCLUDE,
  });

  const updatedPlan = await prisma.projectPlan.findUnique({
    where: { id: planId },
    include: PLAN_INCLUDE,
  });

  return {
    action: enrichActionWithSchedule(action),
    plan: formatPlanResponse(updatedPlan),
  };
};

const updatePlanAction = async (user, actionId, payload) => {
  assertCompanyManager(user);

  const existing = await loadActionForUser(actionId, user);
  assertDraftPlan(existing.plan);
  assertPlanNotCompleted(existing.plan);

  const planId = existing.planId;
  const planActions = await prisma.projectPlanAction.findMany({
    where: { planId },
  });

  const data = {};

  if (payload.title !== undefined) {
    if (!payload.title?.trim()) {
      createBadRequestError("عنوان اقدام الزامی است", 400);
    }
    data.title = payload.title.trim();
  }

  if (payload.description !== undefined) {
    createBadRequestError(
      "ویرایش توضیحات فقط پس از قفل شدن برنامه مجاز است",
      400,
    );
  }

  const nextStartDate =
    payload.startDate !== undefined ? payload.startDate : existing.startDate;
  const nextEndDate =
    payload.endDate !== undefined ? payload.endDate : existing.endDate;

  if (payload.startDate !== undefined) {
    data.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }

  if (payload.endDate !== undefined) {
    data.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }

  if (nextStartDate && nextEndDate) {
    validateDateRange(nextStartDate, nextEndDate);
  }

  if (payload.executorId !== undefined) {
    if (payload.executorId) {
      await validateExecutor(
        payload.executorId,
        existing.plan.project.companyId,
      );
    }
    data.executorId = payload.executorId || null;
  }

  if (payload.order !== undefined) {
    data.order = payload.order;
  }

  if (payload.prerequisiteActionId !== undefined) {
    if (payload.prerequisiteActionId) {
      validatePrerequisiteOwnership(
        payload.prerequisiteActionId,
        planId,
        planActions,
        actionId,
      );
    }
    data.prerequisiteActionId = payload.prerequisiteActionId || null;
  }

  const action = await prisma.projectPlanAction.update({
    where: { id: actionId },
    data,
    include: ACTION_INCLUDE,
  });

  const updatedPlan = await prisma.projectPlan.findUnique({
    where: { id: planId },
    include: PLAN_INCLUDE,
  });

  return {
    action: enrichActionWithSchedule(action),
    plan: formatPlanResponse(updatedPlan),
  };
};

const deletePlanAction = async (user, actionId) => {
  assertCompanyManager(user);

  const existing = await loadActionForUser(actionId, user);
  assertDraftPlan(existing.plan);
  assertPlanNotCompleted(existing.plan);

  await prisma.projectPlanAction.delete({
    where: { id: actionId },
  });

  const updatedPlan = await prisma.projectPlan.findUnique({
    where: { id: existing.planId },
    include: PLAN_INCLUDE,
  });

  return formatPlanResponse(updatedPlan);
};

const validatePlanForLock = async (plan) => {
  const actions = plan.actions;

  if (!actions.length) {
    createBadRequestError("برنامه باید حداقل یک اقدام داشته باشد", 400);
  }

  for (const action of actions) {
    if (!action.title?.trim()) {
      createBadRequestError("عنوان تمام اقدامات الزامی است", 400);
    }

    if (!action.startDate || !action.endDate) {
      createBadRequestError("تاریخ شروع و پایان برای تمام اقدامات الزامی است", 400);
    }

    validateDateRange(action.startDate, action.endDate);

    if (!action.executorId) {
      createBadRequestError("مجری برای تمام اقدامات الزامی است", 400);
    }

    await validateExecutor(action.executorId, plan.project.companyId);

    if (action.prerequisiteActionId) {
      validatePrerequisiteOwnership(
        action.prerequisiteActionId,
        plan.id,
        actions,
        action.id,
      );
    }
  }

  validateOrderValues(actions);
  validateNoCircularDependencies(actions);
};

const lockProjectPlan = async (user, planId) => {
  assertCompanyManager(user);

  const plan = await loadPlanForUser(planId, user);

  if (plan.status !== "DRAFT") {
    createBadRequestError("فقط برنامه‌های پیش‌نویس قابل قفل شدن هستند", 400);
  }

  assertPlanNotCompleted(plan);

  await validatePlanForLock(plan);

  const allAlreadyCompleted = plan.actions.every(
    (action) => (action.progress ?? 0) >= 100,
  );

  const lockedPlan = await prisma.projectPlan.update({
    where: { id: planId },
    data: {
      status: allAlreadyCompleted ? "COMPLETED" : "IN_PROGRESS",
      lockedAt: new Date(),
    },
    include: PLAN_INCLUDE,
  });

  return formatPlanResponse(lockedPlan);
};

const parseAndValidateProgress = (progress) => {
  const parsedProgress = parseInt(progress, 10);

  if (
    Number.isNaN(parsedProgress) ||
    parsedProgress < 0 ||
    parsedProgress > 100
  ) {
    createBadRequestError("پیشرفت باید بین ۰ تا ۱۰۰ باشد", 400);
  }

  return parsedProgress;
};

const applyActionProgressUpdate = async (
  tx,
  { actionId, progress, userId, planId },
) => {
  const parsedProgress = parseAndValidateProgress(progress);
  const status = deriveActionStatusFromProgress(parsedProgress);
  const completedAt = parsedProgress >= 100 ? new Date() : null;

  const action = await tx.projectPlanAction.update({
    where: { id: actionId },
    data: {
      progress: parsedProgress,
      status,
      completedAt,
    },
    include: ACTION_INCLUDE,
  });

  await tx.projectPlanActionProgressHistory.create({
    data: {
      actionId,
      progress: parsedProgress,
      updatedBy: userId,
    },
  });

  await syncPlanStatusFromActions(planId, tx);

  return action;
};

const updateActionProgress = async (user, actionId, progress) => {
  assertCompanyManager(user);

  const existing = await loadActionForUser(actionId, user);
  assertPlanAllowsProgressUpdates(existing.plan);

  const parsedProgress = parseAndValidateProgress(progress);

  const result = await prisma.$transaction(async (tx) => {
    const action = await applyActionProgressUpdate(tx, {
      actionId,
      progress: parsedProgress,
      userId: user.id,
      planId: existing.planId,
    });

    const plan = await tx.projectPlan.findUnique({
      where: { id: existing.planId },
      include: PLAN_INCLUDE,
    });

    return {
      action: enrichActionWithSchedule(action),
      plan: formatPlanResponse(plan),
    };
  });

  return result;
};

const getActionProgressHistory = async (user, actionId) => {
  assertCompanyManager(user);

  const existing = await loadActionForUser(actionId, user);

  const history = await prisma.projectPlanActionProgressHistory.findMany({
    where: { actionId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return {
    actionId: existing.id,
    planId: existing.planId,
    history: history.map((entry) => ({
      id: entry.id,
      progress: entry.progress,
      createdAt: entry.createdAt,
      user: entry.user,
    })),
  };
};

const bulkUpdatePlanActionCompletions = async (user, planId, payload) => {
  assertCompanyManager(user);

  const plan = await loadPlanForUser(planId, user);

  const updates = payload.actions || [];

  if (!updates.length) {
    createBadRequestError("حداقل یک اقدام برای به‌روزرسانی لازم است", 400);
  }

  const planActionIds = new Set(plan.actions.map((action) => action.id));
  const seenActionIds = new Set();
  let hasDescriptionUpdate = false;
  let hasProgressUpdate = false;

  for (const item of updates) {
    if (!planActionIds.has(item.actionId)) {
      createBadRequestError("اقدام انتخاب‌شده متعلق به این برنامه نیست", 400);
    }

    if (seenActionIds.has(item.actionId)) {
      createBadRequestError("شناسه اقدام تکراری در درخواست bulk", 400);
    }

    seenActionIds.add(item.actionId);

    const hasDescription = Object.prototype.hasOwnProperty.call(
      item,
      "description",
    );
    const hasPreviouslyCompleted = Object.prototype.hasOwnProperty.call(
      item,
      "previouslyCompleted",
    );
    const hasProgress = Object.prototype.hasOwnProperty.call(item, "progress");

    if (!hasDescription && !hasPreviouslyCompleted && !hasProgress) {
      createBadRequestError(
        "برای هر اقدام حداقل description یا previouslyCompleted یا progress لازم است",
        400,
      );
    }

    if (hasDescription) {
      hasDescriptionUpdate = true;
    }

    if (hasPreviouslyCompleted || hasProgress) {
      hasProgressUpdate = true;
    }
  }

  if (hasDescriptionUpdate) {
    assertPlanAllowsDescriptionUpdates(plan);
  }

  if (hasProgressUpdate) {
    assertPlanAllowsProgressUpdates(plan);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      if (Object.prototype.hasOwnProperty.call(item, "description")) {
        await tx.projectPlanAction.update({
          where: { id: item.actionId },
          data: {
            description: item.description?.trim() || null,
          },
        });
      }

      if (Object.prototype.hasOwnProperty.call(item, "progress")) {
        await applyActionProgressUpdate(tx, {
          actionId: item.actionId,
          progress: item.progress,
          userId: user.id,
          planId,
        });
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(item, "previouslyCompleted")) {
        await applyActionProgressUpdate(tx, {
          actionId: item.actionId,
          progress: item.previouslyCompleted ? 100 : 0,
          userId: user.id,
          planId,
        });
      }
    }
  });

  const updatedPlan = await prisma.projectPlan.findUnique({
    where: { id: planId },
    include: PLAN_INCLUDE,
  });

  return formatPlanResponse(updatedPlan);
};

const deleteProjectPlan = async (user, planId) => {
  assertCompanyManager(user);

  const plan = await loadPlanForUser(planId, user);

  await prisma.projectPlan.delete({
    where: { id: plan.id },
  });

  return {
    projectId: plan.projectId,
    deletedPlanId: plan.id,
  };
};

module.exports = {
  createProjectPlan,
  getProjectPlanByProject,
  getProjectPlanDetails,
  listProjectPlans,
  createPlanAction,
  updatePlanAction,
  bulkUpdatePlanActionCompletions,
  bulkUpdatePlanActionDescriptions: bulkUpdatePlanActionCompletions,
  deletePlanAction,
  deleteProjectPlan,
  lockProjectPlan,
  updateActionProgress,
  getActionProgressHistory,
};
