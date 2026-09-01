const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');
const cache = require('./cache.service');

const SALT_ROUNDS = 12;
const SESSION_TTL = 15 * 60; // 15 min

const authService = {
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  signAccessToken(payload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES,
    });
  },

  signRefreshToken(payload) {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES,
    });
  },

  verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  },

  verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  },

  // Cache user session in Redis (fast auth path)
  async cacheSession(user) {
    const session = {
      userId: user._id ? user._id.toString() : user.userId,
      role: user.role,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
    };
    await cache.set(cache.session(user._id), session, SESSION_TTL);
    return session;
  },

  async getSession(userId) {
    return cache.get(cache.session(userId));
  },

  async refreshSessionTtl(userId) {
    const session = await cache.get(cache.session(userId));
    if (session) {
      await cache.set(cache.session(userId), session, SESSION_TTL);
      return true;
    }
    return false;
  },

  async clearSession(userId) {
    return cache.del(cache.session(userId));
  },

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async storeOTP(email, otp) {
    return cache.set(cache.otp(email), String(otp), 600); // 10 min
  },

  async getOTP(email) {
    return cache.get(cache.otp(email));
  },

  async clearOTP(email) {
    return cache.del(cache.otp(email));
  },
};

module.exports = authService;
