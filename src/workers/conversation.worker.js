const { Worker } = require("bullmq");
const { redisConnectionOptions } = require("../configs/redis");
const prisma = require("../prismaClient");
const {
  handleConversationStepService,
} = require("../services/analysisFormService");
const { markProjectAnalysisFailed } = require("../utils/analysisFailure");

const worker = new Worker(
  "conversation",
  async (job) => {
    const { projectId, userId, userInput, understood } = job.data;
    const maxAttempts = job.opts?.attempts ?? 1;

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "AI_PROCESSING" },
      });
    } catch {
      // Status update failure should not crash the worker process.
    }

    try {
      return await handleConversationStepService(
        projectId,
        userId,
        userInput,
        understood,
      );
    } catch (error) {
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        try {
          await markProjectAnalysisFailed(projectId);
        } catch {
          // ignore secondary failure
        }
      }

      // Re-throw so BullMQ records failedReason and applies retry/backoff.
      throw error;
    }
  },
  {
    connection: { ...redisConnectionOptions },
    concurrency: 2,
    lockDuration: 300000,
  },
);

worker.on("failed", async (job, error) => {
  const maxAttempts = job?.opts?.attempts ?? 1;
  const isFinalAttempt = (job?.attemptsMade ?? 0) >= maxAttempts;

  if (!job?.data?.projectId || !isFinalAttempt) {
    return;
  }

  try {
    await markProjectAnalysisFailed(job.data.projectId);
  } catch (updateError) {
    console.error(
      "Failed to set project status to FAILED:",
      job.data?.projectId,
      updateError,
    );
  }
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

const shutdown = async () => {
  try {
    await worker.close();
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = worker;
