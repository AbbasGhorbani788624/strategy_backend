const prisma = require("../prismaClient");
const { createBadRequestError } = require("../utils");
const { createStrategyFlowError } = require("../utils/strategyPlanResume");
const { assertCompanyProjectPlanRole } = require("./projectPlanAccessService");
const {
  parseListQuery,
  buildPaginationMeta,
} = require("../utils/listQueryUtils");

const loadPlanForCompany = async (user, projectPlanId) => {
  const plan = await prisma.projectPlan.findUnique({
    where: { id: projectPlanId },
    include: {
      project: { select: { id: true, title: true, companyId: true } },
    },
  });

  if (!plan) {
    createStrategyFlowError(
      "PROJECT_PLAN_NOT_FOUND",
      "برنامه پروژه یافت نشد",
      404,
    );
  }

  if (!user.companyId || plan.project.companyId !== user.companyId) {
    createStrategyFlowError(
      "PLAN_ACCESS_DENIED",
      "به این برنامه پروژه دسترسی ندارید",
      403,
    );
  }

  return plan;
};

const {
  buildProjectPlanAccessGrantedPayload,
  createNotification,
} = require("./notificationDispatchService");

const notifyProjectPlanAccessGranted = async ({
  granteeId,
  grantedByUserId,
  plan,
  permission,
}) => {
  const granter = await prisma.user.findUnique({
    where: { id: grantedByUserId },
    select: { username: true },
  });
  const granterName = granter?.username || "مدیر شرکت";

  await createNotification(
    buildProjectPlanAccessGrantedPayload({
      userId: granteeId,
      plan,
      permission,
      granterUsername: granterName,
    }),
  );
};

const listCollaboratorsService = async (user, projectPlanId) => {
  assertCompanyProjectPlanRole(user);
  await loadPlanForCompany(user, projectPlanId);

  const items = await prisma.projectPlanAccess.findMany({
    where: { projectPlanId, revokedAt: null },
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
  projectPlanId,
  { userId: granteeId, permission = "EDIT" },
) => {
  assertCompanyProjectPlanRole(user);
  const plan = await loadPlanForCompany(user, projectPlanId);

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

  const existing = await prisma.projectPlanAccess.findFirst({
    where: { projectPlanId, userId: granteeId, revokedAt: null },
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

    const updated = await prisma.projectPlanAccess.update({
      where: { id: existing.id },
      data: { permission },
    });

    await notifyProjectPlanAccessGranted({
      granteeId,
      grantedByUserId: user.id,
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

  const access = await prisma.projectPlanAccess.create({
    data: {
      companyId: plan.project.companyId,
      projectPlanId: plan.id,
      userId: granteeId,
      permission,
      grantedByUserId: user.id,
    },
  });

  await notifyProjectPlanAccessGranted({
    granteeId,
    grantedByUserId: user.id,
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
  projectPlanId,
  granteeId,
  { permission },
) => {
  assertCompanyProjectPlanRole(user);
  await loadPlanForCompany(user, projectPlanId);

  if (permission !== "VIEW" && permission !== "EDIT") {
    createBadRequestError("permission نامعتبر است", 400);
  }

  const access = await prisma.projectPlanAccess.findFirst({
    where: { projectPlanId, userId: granteeId, revokedAt: null },
  });

  if (!access) {
    createBadRequestError("دسترسی فعالی برای این کاربر یافت نشد", 404);
  }

  const updated = await prisma.projectPlanAccess.update({
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

const revokeCollaboratorService = async (user, projectPlanId, granteeId) => {
  assertCompanyProjectPlanRole(user);
  await loadPlanForCompany(user, projectPlanId);

  const access = await prisma.projectPlanAccess.findFirst({
    where: { projectPlanId, userId: granteeId, revokedAt: null },
  });

  if (!access) {
    createBadRequestError("دسترسی فعالی برای این کاربر یافت نشد", 404);
  }

  await prisma.projectPlanAccess.update({
    where: { id: access.id },
    data: { revokedAt: new Date() },
  });
};

const PROJECT_PLAN_RECEIVED_ACCESS_INCLUDE = {
  grantedBy: { select: { id: true, username: true } },
  plan: {
    include: {
      project: { select: { id: true, title: true } },
    },
  },
};

const buildProjectPlanReceivedAccessWhere = (user, search) => {
  const trimmed = search?.trim();
  return {
    userId: user.id,
    revokedAt: null,
    companyId: user.companyId,
    ...(trimmed
      ? {
          plan: {
            project: {
              title: { contains: trimmed },
            },
          },
        }
      : {}),
  };
};

const fetchReceivedProjectPlanAccessPage = async (
  user,
  { page, limit, skip, search },
) => {
  if (user.role !== "MEMBER" || !user.companyId) {
    return { rows: [], totalItems: 0 };
  }

  const where = buildProjectPlanReceivedAccessWhere(user, search);

  const [rows, totalItems] = await Promise.all([
    prisma.projectPlanAccess.findMany({
      where,
      include: PROJECT_PLAN_RECEIVED_ACCESS_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.projectPlanAccess.count({ where }),
  ]);

  return { rows, totalItems };
};

const mapProjectPlanSharedWithMeItem = (row) => ({
  planId: row.projectPlanId,
  projectId: row.plan.projectId,
  projectTitle: row.plan.project?.title ?? null,
  permission: row.permission,
  planStatus: row.plan.status,
  grantedAt: row.createdAt,
});

const listSharedWithMeService = async (user, query = {}) => {
  if (user.role !== "MEMBER") {
    createBadRequestError("این لیست فقط برای کاربران عضو شرکت است", 403);
  }

  const { page, limit, skip, search } = parseListQuery(query, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  const { rows, totalItems } = await fetchReceivedProjectPlanAccessPage(user, {
    page,
    limit,
    skip,
    search,
  });

  return {
    items: rows.map(mapProjectPlanSharedWithMeItem),
    pagination: buildPaginationMeta({ totalItems, page, limit }),
  };
};

module.exports = {
  listCollaboratorsService,
  grantCollaboratorService,
  updateCollaboratorService,
  revokeCollaboratorService,
  listSharedWithMeService,
  fetchReceivedProjectPlanAccessPage,
  mapProjectPlanSharedWithMeItem,
  buildProjectPlanReceivedAccessWhere,
};
