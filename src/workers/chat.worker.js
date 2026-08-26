const { Worker } = require("bullmq");
const { redisConnectionOptions } = require("../configs/redis");
const { processChatMessageService } = require("../services/chatService");

const worker = new Worker(
  "chat",
  async (job) => {
    const { companyId, userId, userGoal, conversationId } = job.data;

    return processChatMessageService({
      companyId,
      userId,
      userGoal,
      conversationId,
    });
  },
  {
    connection: { ...redisConnectionOptions },
    concurrency: 2,
    lockDuration: 300000,
  },
);

worker.on("failed", (job, error) => {
  console.error("Chat job failed:", job?.id, error?.message || error);
});

worker.on("error", (error) => {
  console.error("Chat worker error:", error);
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
