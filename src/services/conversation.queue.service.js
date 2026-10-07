const prisma = require("../prismaClient");
const conversationQueue = require("../queues/conversation.queue");
const defaultJobOptions = conversationQueue.defaultJobOptions;
const { createBadRequestError } = require("../utils");
const {
  PROJECT_WORKFLOW_ACTION,
  assertProjectWorkflowAccess,
} = require("../utils/projectWorkflowAuthorization");

const ACTIVE_JOB_STATES = ["waiting", "active", "delayed", "paused", "prioritized"];
const ALL_JOB_LOOKUP_STATES = [
  ...ACTIVE_JOB_STATES,
  "completed",
  "failed",
];

const findJobsForProject = async (projectId, states = ALL_JOB_LOOKUP_STATES) => {
  const jobs = await conversationQueue.getJobs(states);
  return jobs.filter((job) => job?.data?.projectId === projectId);
};

const findActiveJobsForProject = async (projectId) =>
  findJobsForProject(projectId, ACTIVE_JOB_STATES);

const countConversationJobsForProject = async (projectId) => {
  const matching = await findJobsForProject(projectId);

  return {
    count: matching.length,
    jobs: matching.map((job) => ({
      id: job.id,
      name: job.name,
      attemptsMade: job.attemptsMade,
      optsAttempts: job.opts?.attempts,
    })),
  };
};

/**
 * Enqueue a conversation/analysis job.
 * Prevents concurrent AI jobs for the same projectId.
 */
const enqueueConversationStep = async ({
  projectId,
  user,
  userInput,
  understood,
  source = "unknown",
}) => {
  const jobOptions = {
    ...defaultJobOptions,
  };

  await assertProjectWorkflowAccess(
    user,
    projectId,
    PROJECT_WORKFLOW_ACTION.CONVERSATION_STEP,
  );

  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { status: true },
  });

  if (!project) {
    createBadRequestError("پروژه یافت نشد", 404);
  }

  const userId = user.id;

  let activeJobs = [];
  try {
    activeJobs = await findActiveJobsForProject(projectId);
  } catch {
    // If Redis lookup fails, continue with enqueue.
  }

  if (activeJobs.length > 0) {
    const existingJob = activeJobs[0];

    if (project.status !== "AI_PROCESSING") {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "AI_PROCESSING" },
      });
    }

    return {
      jobId: existingJob.id,
      status: "AI_PROCESSING",
      deduplicated: true,
    };
  }

  let job;
  try {
    // Add to queue first so a failed add never leaves a stuck AI_PROCESSING project
    // without a corresponding job.
    job = await conversationQueue.add(
      "conversation-step",
      {
        projectId,
        userId,
        userInput,
        understood,
        source,
      },
      jobOptions,
    );
  } catch (error) {
    throw error;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "AI_PROCESSING" },
  });

  return {
    jobId: job.id,
    status: "AI_PROCESSING",
    deduplicated: false,
  };
};

module.exports = {
  enqueueConversationStep,
  countConversationJobsForProject,
  findJobsForProject,
  findActiveJobsForProject,
};
