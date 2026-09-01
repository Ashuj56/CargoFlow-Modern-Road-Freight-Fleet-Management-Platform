const cache = require('../services/cache.service');
const ApiError = require('../utils/ApiError');

const defaults = {
  windowMs: 60,
  max: 60,
};

/**
 * Redis-backed rate limiter.
 * Accepts { windowMs, max } options. Uses IP (and userId if present).
 */
function rateLimiter(options = {}) {
  const opts = { ...defaults, ...options };
  return async (req, res, next) => {
    try {
      const identifier = req.user && req.user.userId ? req.user.userId : req.ip;
      const route = req.originalUrl.split('?')[0].replace(/[^a-zA-Z0-9]/g, '');
      const key = `rate:${identifier}:${route}`;

      const count = await cache.incr(key, opts.windowMs);
      if (count > opts.max) {
        throw new ApiError(429, 'Too many requests, please try again later');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = rateLimiter;
