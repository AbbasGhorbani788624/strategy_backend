const prisma = require("../prismaClient");
const {
  createNotification,
  buildProjectPlanCollaboratorActivityPayload,
  buildStrategyPlanCollaboratorActivityPayload,
} = require("./notificationDispatchService");
const {
  shouldSkipCollaboratorActivityDedupe,
} = require("../utils/collaboratorActivityDedupe");

const resolveProjectPlanGrantContext = async (actorUserId, projectPlanId) => {
  if (!actorUserId || !projectPlanId) {
    return null;
  }

  const access = await prisma.projectPlanAccess.findFirst({
    where: {
      projectPlanId,
      userId: actorUserId,
      permission: "EDIT",
      revokedAt: null,
    },
    select: { grantedByUserId: true },
  });

  const plan = await prisma.projectPlan.findUnique({
    where: { id: projectPlanId },
    include: {
      project: { select: { id: true, title: true } },
    },
  });

  if (!plan) {
    return null;
  }

  if (access?.grantedByUserId) {
    return {
      recipientId: access.grantedByUserId,
      plan,
      projectId: plan.projectId,
      projectTitle: plan.project?.title || "پروژه",
    };
  }

  const projectAccess = await prisma.projectAccess.findUnique({
    where: {
      projectId_userId: {
        projectId: plan.projectId,
        userId: actorUserId,
      },
    },
    select: { canAction: true, grantedByUserId: true },
  });

  if (!projectAccess?.canAction || !projectAccess.grantedByUserId) {
    return null;
  }

  return {
    recipientId: projectAccess.grantedByUserId,
    plan,
    projectId: plan.projectId,
    projectTitle: plan.project?.title || "پروژه",
  };
};

const resolveStrategyPlanGrantContext = async (actorUserId, planId) => {
  if (!actorUserId || !planId) {
    return null;
  }

  const access = await prisma.strategyPlanAccess.findFirst({
    where: {
      planId,
      userId: actorUserId,
      permission: "EDIT",
      revokedAt: null,
    },
    select: { grantedByUserId: true },
  });

  if (!access?.grantedByUserId) {
    return null;
  }

  const plan = await prisma.strategyPlan.findUnique({
    where: { id: planId },
    include: {
      project: { select: { id: true, title: true } },
    },
  });

  if (!plan) {
    return null;
  }

  return {
    recipientId: access.grantedByUserId,
    plan,
    projectTitle: plan.project?.title || "پروژه",
  };
};

const notifyProjectPlanCollaboratorActivity = async (
  actorUserId,
  projectPlanId,
  action,
) => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, username: true, role: true },
  });

  if (!actor || actor.role === "COMPANY" || actor.role === "SUPER_ADMIN") {
    return null;
  }

  const ctx = await resolveProjectPlanGrantContext(actorUserId, projectPlanId);
  if (!ctx || ctx.recipientId === actorUserId) {
    return null;
  }

  const referenceId = ctx.projectId;
  const type = "PROJECT_PLAN_COLLABORATOR_ACTIVITY";

  if (
    await shouldSkipCollaboratorActivityDedupe({
      recipientId: ctx.recipientId,
      type,
      referenceId,
      actorUserId,
      action,
    })
  ) {
    return null;
  }

  const actorUsername = actor.username || "همکار";

  return createNotification(
    buildProjectPlanCollaboratorActivityPayload({
      userId: ctx.recipientId,
      projectId: ctx.projectId,
      projectTitle: ctx.projectTitle,
      planId: projectPlanId,
      actorUserId,
      actorUsername,
      action,
    }),
  );
};

const notifyStrategyPlanCollaboratorActivity = async (
  actorUserId,
  planId,
  action,
) => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, username: true, role: true },
  });

  if (!actor || actor.role === "COMPANY" || actor.role === "SUPER_ADMIN") {
    return null;
  }

  const ctx = await resolveStrategyPlanGrantContext(actorUserId, planId);
  if (!ctx || ctx.recipientId === actorUserId) {
    return null;
  }

  const type = "STRATEGY_PLAN_COLLABORATOR_ACTIVITY";

  if (
    await shouldSkipCollaboratorActivityDedupe({
      recipientId: ctx.recipientId,
      type,
      referenceId: planId,
      actorUserId,
      action,
    })
  ) {
    return null;
  }

  const actorUsername = actor.username || "همکار";

  return createNotification(
    buildStrategyPlanCollaboratorActivityPayload({
      userId: ctx.recipientId,
      plan: ctx.plan,
      actorUserId,
      actorUsername,
      action,
    }),
  );
};

const fireAndForgetProjectPlanActivity = (actorUserId, planId, action) => {
  notifyProjectPlanCollaboratorActivity(actorUserId, planId, action).catch(
    (err) => {
      console.error("[notify] project plan collaborator activity failed:", err);
    },
  );
};

const fireAndForgetStrategyPlanActivity = (actorUserId, planId, action) => {
  notifyStrategyPlanCollaboratorActivity(actorUserId, planId, action).catch(
    (err) => {
      console.error("[notify] strategy plan collaborator activity failed:", err);
    },
  );
};

module.exports = {
  PROJECT_PLAN_COLLABORATOR_ACTION: {
    ACTION_CREATED: "ACTION_CREATED",
    ACTION_UPDATED: "ACTION_UPDATED",
    ACTION_DELETED: "ACTION_DELETED",
    PROGRESS_UPDATED: "PROGRESS_UPDATED",
  },
  STRATEGY_PLAN_COLLABORATOR_ACTION: {
    MAP_VALIDATED: "MAP_VALIDATED",
    MAP_APPROVED: "MAP_APPROVED",
    KPI_VALIDATED: "KPI_VALIDATED",
    KPI_APPROVED: "KPI_APPROVED",
    TABLE_VALIDATED: "TABLE_VALIDATED",
    TABLE_APPROVED: "TABLE_APPROVED",
    MEASURES_SYNCED: "MEASURES_SYNCED",
    PLAN_UPDATED: "PLAN_UPDATED",
  },
  notifyProjectPlanCollaboratorActivity,
  notifyStrategyPlanCollaboratorActivity,
  fireAndForgetProjectPlanActivity,
  fireAndForgetStrategyPlanActivity,
};
