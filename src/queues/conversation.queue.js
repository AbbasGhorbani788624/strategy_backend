const { Queue } = require("bullmq");
const { redisConnectionOptions } = require("../configs/redis");

const queueName = "conversation";

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

const conversationQueue = new Queue(queueName, {
  connection: { ...redisConnectionOptions },
  defaultJobOptions,
});

module.exports = conversationQueue;
module.exports.defaultJobOptions = defaultJobOptions;
