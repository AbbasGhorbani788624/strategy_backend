const prisma = require("../prismaClient");
const conversationQueue = require("../queues/conversation.queue");
const { createBadRequestError } = require("../utils");

const enqueueConversationStep = async ({
  projectId,
  userId,
  userInput,
  understood,
}) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, creatorId: userId },
    select: { status: true },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "AI_PROCESSING" },
  });

  const job = await conversationQueue.add(
    "conversation-step",
    {
      projectId,
      userId,
      userInput,
      understood,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

  return { jobId: job.id };
};

module.exports = {
  enqueueConversationStep,
};
