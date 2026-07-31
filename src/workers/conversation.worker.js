const { Worker } = require("bullmq");
const redis = require("../configs/redis");
const prisma = require("../prismaClient");
const {
  handleConversationStepService,
} = require("../services/analysisFormService");
const { markProjectAnalysisFailed } = require("../utils/analysisFailure");

const worker = new Worker(
  "conversation",
  async (job) => {
    const { projectId, userId, userInput, understood } = job.data;

    console.log("Processing:", projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "AI_PROCESSING",
      },
    });

    try {
      await handleConversationStepService(
        projectId,
        userId,
        userInput,
        understood,
      );
    } catch (error) {
      const maxAttempts = job.opts?.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        await markProjectAnalysisFailed(projectId);
      }

      throw error;
    }

    console.log("Finished:", projectId);
  },
  {
    connection: redis,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log("Completed", job.id, "projectId:", job.data?.projectId);
});

worker.on("failed", async (job, error) => {
  console.error("Failed", job?.id, "projectId:", job?.data?.projectId, error);

  if (!job?.data?.projectId) {
    return;
  }

  const maxAttempts = job.opts?.attempts ?? 1;

  if (job.attemptsMade >= maxAttempts) {
    try {
      await markProjectAnalysisFailed(job.data.projectId);
    } catch (updateError) {
      console.error(
        "Failed to set project status to FAILED:",
        job.data?.projectId,
        updateError,
      );
    }
  }
});

module.exports = worker;
