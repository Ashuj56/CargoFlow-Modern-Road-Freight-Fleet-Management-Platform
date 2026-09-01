const { Worker } = require('bullmq');
const { getClient, connectRedis } = require('../../config/redis');
const { handleNotificationJob } = require('../notification.queue');
const { hasRedis } = require('../../config/env');

/**
 * Email worker for BullMQ (only when real Redis is available).
 * Also falls back to inline processing in memory mode (handled by queue).
 */
function startEmailWorker() {
  if (!hasRedis) {
    console.log('📧 Email worker: in-memory mode (no Redis)');
    return null;
  }

  let worker;
  try {
    const raw = getClient()?.getRaw ? getClient().getRaw() : null;
    if (!raw) {
      console.log('📧 Email worker: no redis connection, in-memory mode');
      return null;
    }

    worker = new Worker(
      'notification-queue',
      async (job) => {
        await handleNotificationJob(job);
        return { ok: true };
      },
      {
        connection: raw,
        concurrency: 5,
      }
    );

    worker.on('failed', (job, err) => {
      console.error(`📧 Email job ${job?.name} failed:`, err.message);
    });

    console.log('📧 Email worker started');
  } catch (err) {
    console.warn('⚠️  Email worker failed to start:', err.message);
  }
  return worker;
}

module.exports = { startEmailWorker };
