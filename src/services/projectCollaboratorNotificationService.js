const prisma = require("../prismaClient");
const {
  createNotification,
  buildProjectCollaboratorActivityPayload,
} = require("./notificationDispatchService");
const {
  shouldSkipCollaboratorActivityDedupe,
} = require("../utils/collaboratorActivityDedupe");

const PROJECT_ACCESS_CAPABILITY = {
  ACTION: "canAction",
  VISUALIZE: "canVisualize",
};

const resolveProjectAccessGrantContext = async (
  actorUserId,
  projectId,
  capability,
) => {
  if (!actorUserId || !projectId || !capability) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, creatorId: true, status: true },
  });

  if (!project || project.creatorId === actorUserId) {
    return null;
  }

  const access = await prisma.projectAccess.findUnique({
    where: {
      projectId_userId: { projectId, userId: actorUserId },
    },
    select: {
      canAction: true,
      canVisualize: true,
      grantedByUserId: true,
    },
  });

  if (!access?.grantedByUserId) {
    return null;
  }

  if (capability === PROJECT_ACCESS_CAPABILITY.ACTION && !access.canAction) {
    return null;
  }

  if (
    capability === PROJECT_ACCESS_CAPABILITY.VISUALIZE &&
    !access.canVisualize
  ) {
    return null;
  }

  return {
    recipientId: access.grantedByUserId,
    project,
    projectTitle: project.title || "پروژه",
  };
};

const notifyProjectAccessCollaboratorActivity = async (
  actorUserId,
  projectId,
  action,
  capability,
) => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, username: true, role: true },
  });

  if (!actor || actor.role === "COMPANY" || actor.role === "SUPER_ADMIN") {
    return null;
  }

  const ctx = await resolveProjectAccessGrantContext(
    actorUserId,
    projectId,
    capability,
  );

  if (!ctx || ctx.recipientId === actorUserId) {
    return null;
  }

  const type = "PROJECT_COLLABORATOR_ACTIVITY";

  if (
    await shouldSkipCollaboratorActivityDedupe({
      recipientId: ctx.recipientId,
      type,
      referenceId: projectId,
      actorUserId,
      action,
    })
  ) {
    return null;
  }

  const actorUsername = actor.username || "همکار";

  return createNotification(
    buildProjectCollaboratorActivityPayload({
      userId: ctx.recipientId,
      projectId,
      projectTitle: ctx.projectTitle,
      actorUserId,
      actorUsername,
      action,
      projectStatus: ctx.project.status,
    }),
  );
};

const fireAndForgetProjectAccessActivity = (
  actorUserId,
  projectId,
  action,
  capability,
) => {
  notifyProjectAccessCollaboratorActivity(
    actorUserId,
    projectId,
    action,
    capability,
  ).catch((err) => {
    console.error("[notify] project access collaborator activity failed:", err);
  });
};

module.exports = {
  PROJECT_ACCESS_CAPABILITY,
  resolveProjectAccessGrantContext,
  notifyProjectAccessCollaboratorActivity,
  fireAndForgetProjectAccessActivity,
};
