const prisma = require("../prismaClient");

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Skip creating a duplicate collaborator-activity notification when the same
 * actor performed the same action on the same reference for the same recipient
 * within the dedupe window.
 */
const shouldSkipCollaboratorActivityDedupe = async ({
  recipientId,
  type,
  referenceId,
  actorUserId,
  action,
}) => {
  if (!recipientId || !type || !referenceId || !actorUserId || !action) {
    return false;
  }

  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const recent = await prisma.notification.findMany({
    where: {
      userId: recipientId,
      type,
      referenceId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { metadata: true },
  });

  return recent.some(
    (row) =>
      row.metadata?.actorUserId === actorUserId &&
      row.metadata?.action === action,
  );
};

module.exports = {
  DEDUPE_WINDOW_MS,
  shouldSkipCollaboratorActivityDedupe,
};
