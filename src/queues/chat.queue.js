const { Queue } = require("bullmq");
const { redisConnectionOptions } = require("../configs/redis");

const queueName = "chat";

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

const chatQueue = new Queue(queueName, {
  connection: { ...redisConnectionOptions },
  defaultJobOptions,
});

module.exports = chatQueue;
module.exports.defaultJobOptions = defaultJobOptions;
