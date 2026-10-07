const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const { createStrategyFlowError } = require("../utils/strategyPlanResume");
const {
  assertCompanyStrategyRole,
  assertPlanAccess,
  PLAN_PERMISSION,
} = require("./strategyPlanAccessService");
const {
  resolveStageInfo,
  isReadyForMonitoring,
  INACTIVE_STRATEGY_STATUSES,
} = require("../utils/strategyPlanResume");
const {
  parseListQuery,
  buildPaginationMeta,
  buildProjectTitleSearchFilter,
} = require("../utils/listQueryUtils");

const loadPlanForCompany = async (user, planId) => {
  const plan = await prisma.strategyPlan.findUnique({
    where: { id: planId },
    include: {
      project: { select: { id: true, title: true } },
    },
  });

  if (!plan) {
    createBadRequestError("برنامه استراتژی یافت نشد", 404);
  }

  if (!user.companyId || plan.companyId !== user.companyId) {
    createStrategyFlowError(
      "PLAN_ACCESS_DENIED",
      "به این برنامه استراتژی دسترسی ندارید",
      403,
    );
  }

  return plan;
};

const {
  buildStrategyPlanAccessGrantedPayload,
  createNotification,
  resolveStrategyPlanMonitoringReady,
} = require("./notificationDispatchService");

const notifyPlanAccessGranted = async ({
  granteeId,
  plan,
  permission,
}) => {
  const monitoringReady = await resolveStrategyPlanMonitoringReady(plan.id);

  await createNotification(
    buildStrategyPlanAccessGrantedPayload({
      userId: granteeId,
      plan,
      permission,
      isReadyForMonitoring: monitoringReady,
    }),
  );
};

const listCollaboratorsService = async (user, planId) => {
  assertCompanyStrategyRole(user);
  await loadPlanForCompany(user, planId);

  const items = await prisma.strategyPlanAccess.findMany({
    where: { planId, revokedAt: null },
    include: {
      user: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    items: items.map((row) => ({
      userId: row.userId,
      username: row.user.username,
      permission: row.permission,
      grantedAt: row.createdAt,
    })),
  };
};

const grantCollaboratorService = async (
  user,
  planId,
  { userId: granteeId, permission = "EDIT" },
) => {
  assertCompanyStrategyRole(user);
  const plan = await loadPlanForCompany(user, planId);

  if (!granteeId) {
    createBadRequestError("userId الزامی است", 400);
  }

  if (granteeId === user.id) {
    createBadRequestError("نمی‌توانید به خودتان دسترسی بدهید", 400);
  }

  if (permission !== "VIEW" && permission !== "EDIT") {
    createBadRequestError("permission نامعتبر است", 400);
  }

  const grantee = await prisma.user.findUnique({
    where: { id: granteeId },
    select: { id: true, role: true, companyId: true, username: true },
  });

  if (!grantee || grantee.companyId !== user.companyId) {
    createBadRequestError("کاربر عضو این شرکت نیست", 400);
  }

  if (grantee.role !== "MEMBER") {
    createBadRequestError("دسترسی فقط به کاربران (MEMBER) قابل اعطاست", 400);
  }

  const existing = await prisma.strategyPlanAccess.findFirst({
    where: { planId, userId: granteeId, revokedAt: null },
  });

  if (existing) {
    if (existing.permission === permission) {
      return {
        userId: existing.userId,
        username: grantee.username,
        permission: existing.permission,
        grantedAt: existing.createdAt,
        existing: true,
      };
    }

    const updated = await prisma.strategyPlanAccess.update({
      where: { id: existing.id },
      data: { permission },
    });

    await notifyPlanAccessGranted({
      granteeId,
      plan,
      permission,
    });

    return {
      userId: updated.userId,
      username: grantee.username,
      permission: updated.permission,
      grantedAt: updated.createdAt,
      updated: true,
    };
  }

  const access = await prisma.strategyPlanAccess.create({
    data: {
      companyId: plan.companyId,
      planId: plan.id,
      userId: granteeId,
      permission,
      grantedByUserId: user.id,
    },
  });

  await notifyPlanAccessGranted({
    granteeId,
    plan,
    permission,
  });

  return {
    userId: access.userId,
    username: grantee.username,
    permission: access.permission,
    grantedAt: access.createdAt,
  };
};

const updateCollaboratorService = async (
  user,
  planId,
  granteeId,
  { permission },
) => {
  assertCompanyStrategyRole(user);
  await loadPlanForCompany(user, planId);

  if (permission !== "VIEW" && permission !== "EDIT") {
    createBadRequestError("permission نامعتبر است", 400);
  }

  const access = await prisma.strategyPlanAccess.findFirst({
    where: { planId, userId: granteeId, revokedAt: null },
  });

  if (!access) {
    createBadRequestError("دسترسی فعالی برای این کاربر یافت نشد", 404);
  }

  const updated = await prisma.strategyPlanAccess.update({
    where: { id: access.id },
    data: { permission },
    include: { user: { select: { username: true } } },
  });

  return {
    userId: updated.userId,
    username: updated.user.username,
    permission: updated.permission,
    grantedAt: updated.createdAt,
  };
};

const revokeCollaboratorService = async (user, planId, granteeId) => {
  assertCompanyStrategyRole(user);
  await loadPlanForCompany(user, planId);

  const access = await prisma.strategyPlanAccess.findFirst({
    where: { planId, userId: granteeId, revokedAt: null },
  });

  if (!access) {
    createBadRequestError("دسترسی فعالی برای این کاربر یافت نشد", 404);
  }

  await prisma.strategyPlanAccess.update({
    where: { id: access.id },
    data: { revokedAt: new Date() },
  });
};

const STRATEGY_PLAN_RECEIVED_ACCESS_INCLUDE = {
  grantedBy: { select: { id: true, username: true } },
  plan: {
    include: {
      project: { select: { id: true, title: true } },
      approvals: { select: { type: true } },
    },
  },
};

const buildStrategyPlanReceivedAccessWhere = (user, search) => ({
  userId: user.id,
  revokedAt: null,
  companyId: user.companyId,
  plan: {
    status: { notIn: INACTIVE_STRATEGY_STATUSES },
    ...buildProjectTitleSearchFilter(search),
  },
});

const fetchReceivedStrategyPlanAccessPage = async (
  user,
  { page, limit, skip, search },
) => {
  if (user.role !== "MEMBER" || !user.companyId) {
    return { rows: [], totalItems: 0 };
  }

  const where = buildStrategyPlanReceivedAccessWhere(user, search);

  const [rows, totalItems] = await Promise.all([
    prisma.strategyPlanAccess.findMany({
      where,
      include: STRATEGY_PLAN_RECEIVED_ACCESS_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.strategyPlanAccess.count({ where }),
  ]);

  return { rows, totalItems };
};

const mapStrategyPlanSharedWithMeItem = (row) => {
  const hasMeasuresApproval = row.plan.approvals.some(
    (a) => a.type === "MEASURES",
  );
  const { stage, stageLabel } = resolveStageInfo(
    row.plan.state,
    hasMeasuresApproval,
  );
  const monitoringReady = isReadyForMonitoring(
    row.plan,
    hasMeasuresApproval,
  );

  return {
    planId: row.planId,
    framework: row.plan.framework,
    projectTitle: row.plan.project?.title ?? null,
    permission: row.permission,
    stage,
    stageLabel,
    isReadyForMonitoring: monitoringReady,
    grantedAt: row.createdAt,
  };
};

const listSharedWithMeService = async (user, query = {}) => {
  if (user.role !== "MEMBER") {
    createBadRequestError("این لیست فقط برای کاربران عضو شرکت است", 403);
  }

  const { page, limit, skip, search } = parseListQuery(query, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  const { rows, totalItems } = await fetchReceivedStrategyPlanAccessPage(user, {
    page,
    limit,
    skip,
    search,
  });

  return {
    items: rows.map(mapStrategyPlanSharedWithMeItem),
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

module.exports = {
  listCollaboratorsService,
  grantCollaboratorService,
  updateCollaboratorService,
  revokeCollaboratorService,
  listSharedWithMeService,
  fetchReceivedStrategyPlanAccessPage,
  mapStrategyPlanSharedWithMeItem,
  buildStrategyPlanReceivedAccessWhere,
};
