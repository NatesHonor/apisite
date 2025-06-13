const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL,
  legacyMode: false,
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect().catch(console.error);

module.exports = redisClient;
