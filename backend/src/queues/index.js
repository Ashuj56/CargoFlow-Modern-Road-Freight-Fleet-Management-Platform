const { Queue } = require('bullmq');
const { getClient, connectRedis } = require('../config/redis');

let queueConnection = null;

function getConnection() {
  if (queueConnection) return queueConnection;
  queueConnection = { connection: { host: '127.0.0.1', port: 6379 } };
  return queueConnection;
}

function getBullConnection() {
  const { getClient } = require('../config/redis');
  const raw = getClient().getRaw ? getClient().getRaw() : null;
  return raw || { host: '127.0.0.1', port: 6379 };
}

/**
 * Queue factory. Returns a real BullMQ queue when Upstash Redis
 * is configured; otherwise a lightweight in-memory queue that
 * executes jobs inline (for local dev without Redis).
 */
function createQueue(name) {
  const { hasRedis } = require('../config/env');

  if (hasRedis) {
    try {
      return new Queue(name, {
        connection: getBullConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
    } catch (err) {
      console.warn(`⚠️  BullMQ queue "${name}" failed, using in-memory fallback:`, err.message);
    }
  }

  // In-memory fallback queue
  const handlers = new Map();
  return {
    name: `memory:${name}`,
    handlers,
    async add(jobName, data) {
      const handler = handlers.get('*') || handlers.get(jobName);
      if (handler) {
        // execute asynchronously, don't block API response
        setImmediate(() => {
          handler({ name: jobName, data }).catch((err) => console.error(`Job ${jobName} failed:`, err.message));
        });
      } else {
        console.warn(`No handler for job "${jobName}"`);
      }
      return { id: Math.random().toString(36).slice(2), name: jobName };
    },
    on(event, handler) {
      if (event === 'completed') {
        // no-op in memory mode
      }
    },
    async close() {},
  };
}

module.exports = { createQueue, queueConnection };
