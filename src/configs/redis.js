const Redis = require("ioredis");

const redisConnectionOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
};

const createRedisClient = () => {
  const client = new Redis(redisConnectionOptions);

  client.on("connect", () => {
    console.log("Redis connected");
  });

  client.on("error", (err) => {
    console.error("Redis error", err);
  });

  return client;
};

const redis = createRedisClient();

module.exports = redis;
module.exports.redisConnectionOptions = redisConnectionOptions;
module.exports.createRedisClient = createRedisClient;
