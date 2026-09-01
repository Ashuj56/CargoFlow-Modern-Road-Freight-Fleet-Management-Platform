const { getClient } = require('../config/redis');

function client() {
  return getClient();
}

const PREFIX = 'cargoflow:';

function key(name) {
  return `${PREFIX}${name}`;
}

const cache = {
  async get(name) {
    try {
      const raw = await client().get(key(name));
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (err) {
      console.warn('cache.get error:', err.message);
      return null;
    }
  },

  async set(name, value, ttlSeconds) {
    try {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      await client().setex(key(name), ttlSeconds || 60, raw);
      return true;
    } catch (err) {
      console.warn('cache.set error:', err.message);
      return false;
    }
  },

  async del(name) {
    try {
      if (Array.isArray(name)) {
        await client().del(...name.map((n) => key(n)));
      } else {
        await client().del(key(name));
      }
      return true;
    } catch (err) {
      console.warn('cache.del error:', err.message);
      return false;
    }
  },

  async incr(name, ttlSeconds = 60) {
    try {
      const count = await client().incr(key(name));
      if (count === 1) await client().expire(key(name), ttlSeconds);
      return count;
    } catch (err) {
      console.warn('cache.incr error:', err.message);
      return 0;
    }
  },

  // Session helpers
  session(userId) {
    return `session:${userId}`;
  },

  otp(email) {
    return `otp:${email}`;
  },

  rate(ip, route) {
    return `rate:${ip}:${route}`;
  },
};

module.exports = cache;
