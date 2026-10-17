// src/ws/broadcast.js
const IORedis = require('ioredis');

// We use a dedicated Redis connection for Pub/Sub
// because a subscribed client cannot run other commands.
const pubClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const CHANNEL = 'syncward:events';

/**
 * Publish an event to the Web Server.
 * @param {string} eventType - e.g., 'job.progress', 'job.completed'
 * @param {Object} data - The payload (e.g., { jobId: 1, status: 'succeeded' })
 */
async function publishEvent(eventType, data) {
  const message = JSON.stringify({ eventType, data, time: Date.now() });
  await pubClient.publish(CHANNEL, message);
}

module.exports = { publishEvent };