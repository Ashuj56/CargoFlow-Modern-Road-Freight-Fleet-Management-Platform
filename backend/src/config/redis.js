const Redis = require('ioredis');
const { env, hasRedis } = require('./env');

/**
 * A small async storage wrapper so the rest of the app
 * doesn't care whether Redis is real (Upstash) or an
 * in-memory fallback (for local dev without credentials).
 */
class MemoryStore {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    const v = this.map.get(key);
    if (v && v.exp && v.exp < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return v ? v.value : null;
  }
  async set(key, value, ttlSeconds) {
    this.map.set(key, { value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
    return 'OK';
  }
  async setex(key, ttlSeconds, value) {
    return this.set(key, value, ttlSeconds);
  }
  async del(...keys) {
    let n = 0;
    for (const k of keys) {
      if (this.map.delete(k)) n += 1;
    }
    return n;
  }
  async incr(key) {
    const v = await this.get(key);
    const next = (Number(v) || 0) + 1;
    await this.set(key, String(next), 60);
    return next;
  }
  async expire(key, ttlSeconds) {
    const v = this.map.get(key);
    if (v) v.exp = Date.now() + ttlSeconds * 1000;
    return 1;
  }
  async quit() {}
  isReady() {
    return true;
  }
}

const store = new MemoryStore();

let client = store;
let ioredisClient = null;

if (hasRedis) {
  // Upstash exposes a Redis-protocol endpoint derived from the REST URL.
  try {
    const parsed = new URL(env.UPSTASH_REDIS_REST_URL);
    const host = parsed.hostname;
    const port = Number(parsed.port) || 6379;
    const password = env.UPSTASH_REDIS_REST_TOKEN;

    ioredisClient = new Redis({
      host,
      port,
      password,
      tls: {},
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 10000,
      keepAlive: 15000,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 200, 3000);
      },
    });

    ioredisClient.on('error', (err) => {
      // Upstash serverless Redis automatically closes idle TCP sockets (ECONNRESET / ETIMEDOUT).
      // ioredis automatically reconnects when the next command is sent.
      if (err.code === 'ECONNRESET' || err.message?.includes('ECONNRESET')) {
        // Suppress or log as transient idle reconnect
        return;
      }
      console.error('Redis error:', err.message);
    });

    client = {
      async get(...a) {
        return ioredisClient.get(...a);
      },
      async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
          return ioredisClient.set(key, value, 'EX', ttlSeconds);
        }
        return ioredisClient.set(key, value);
      },
      async setex(...a) {
        return ioredisClient.setex(...a);
      },
      async del(...a) {
        return ioredisClient.del(...a);
      },
      async incr(...a) {
        return ioredisClient.incr(...a);
      },
      async expire(...a) {
        return ioredisClient.expire(...a);
      },
      async quit() {
        return ioredisClient.quit();
      },
      isReady() {
        return ioredisClient.status === 'ready' || ioredisClient.status === 'connecting';
      },
      getRaw() {
        return ioredisClient;
      },
    };
  } catch (err) {
    console.warn('⚠️  Failed to initialize Upstash Redis, using in-memory fallback:', err.message);
    client = store;
  }
}

async function connectRedis() {
  if (hasRedis && ioredisClient) {
    try {
      if (ioredisClient.status === 'wait') {
        await ioredisClient.connect();
      }
      console.log('✅ Redis connected (Upstash)');
    } catch (err) {
      if (err.message && (err.message.includes('already') || ioredisClient.status === 'ready' || ioredisClient.status === 'connecting')) {
        console.log('✅ Redis connected (Upstash)');
      } else {
        console.warn('⚠️  Redis connect failed, using in-memory fallback:', err.message);
        client = store;
      }
    }
  } else {
    console.warn('⚠️  No Upstash credentials. Using in-memory Redis fallback (dev only).');
  }
  return client;
}

function getClient() {
  return client;
}

module.exports = { client, getClient, connectRedis, isMemory: !hasRedis };
