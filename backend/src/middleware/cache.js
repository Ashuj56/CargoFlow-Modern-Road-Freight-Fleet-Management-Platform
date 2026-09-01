const cache = require('../services/cache.service');

/**
 * Generic GET route cache wrapper.
 * Short-circuits a response from Redis and stores fresh responses.
 */
function cacheMiddleware(ttlSeconds = 60) {
  return async (req, res, next) => {
    try {
      const id = req.user ? req.user.userId : req.ip;
      const key = `cache:${req.originalUrl}:${id}`;

      const cached = await cache.get(key);
      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        cache.set(key, body, ttlSeconds).catch(() => {});
        return originalJson(body);
      };
      next();
    } catch (err) {
      next();
    }
  };
}

module.exports = cacheMiddleware;
