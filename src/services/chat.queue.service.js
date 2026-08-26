const prisma = require("../prismaClient");
const chatQueue = require("../queues/chat.queue");
const defaultJobOptions = chatQueue.defaultJobOptions;
const { createBadRequestError } = require("../utils");

const ACTIVE_JOB_STATES = [
  "waiting",
  "active",
  "delayed",
  "paused",
  "prioritized",
];
const ALL_JOB_LOOKUP_STATES = [...ACTIVE_JOB_STATES, "completed", "failed"];

const findJobsForConversation = async (
  conversationId,
  states = ALL_JOB_LOOKUP_STATES,
) => {
  const jobs = await chatQueue.getJobs(states);
  return jobs.filter((job) => job?.data?.conversationId === conversationId);
};

const findActiveJobsForConversation = async (conversationId) =>
  findJobsForConversation(conversationId, ACTIVE_JOB_STATES);

/**
 * Enqueue a chatbot message job.
 * Prevents concurrent AI jobs for the same conversationId.
 */
const enqueueChatMessage = async ({
  companyId,
  userId,
  userGoal,
  conversationId,
  source = "unknown",
}) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    createBadRequestError("Company not found", 404);
  }

  let activeJobs = [];
  try {
    activeJobs = await findActiveJobsForConversation(conversationId);
  } catch {
    // If Redis lookup fails, continue with enqueue.
  }

  if (activeJobs.length > 0) {
    const existingJob = activeJobs[0];

    return {
      jobId: existingJob.id,
      status: "PROCESSING",
      deduplicated: true,
    };
  }

  const job = await chatQueue.add(
    "chat-message",
    {
      companyId,
      userId,
      userGoal,
      conversationId,
      source,
    },
    { ...defaultJobOptions },
  );

  return {
    jobId: job.id,
    status: "PROCESSING",
    deduplicated: false,
  };
};

const getChatJobById = async (jobId) => chatQueue.getJob(jobId);

module.exports = {
  enqueueChatMessage,
  findJobsForConversation,
  findActiveJobsForConversation,
  getChatJobById,
};
