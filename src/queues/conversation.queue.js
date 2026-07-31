const { Queue } = require("bullmq");
const redis = require("../configs/redis");


const conversationQueue = new Queue(
  "conversation",
  {
    connection: redis,
  }
);


module.exports = conversationQueue;