const ApiError = require('../utils/ApiError');
const authService = require('../services/auth.service');
const User = require('../models/User');
const { isConnected } = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw new ApiError(401, 'Not authenticated');

    let payload;
    try {
      payload = authService.verifyAccessToken(token);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    const userId = payload.userId || payload.sub;

    // Fast path: check Redis session cache
    const cached = await authService.getSession(userId);
    if (cached) {
      req.user = {
        userId: cached.userId,
        id: cached.userId,
        role: cached.role,
        name: cached.name,
        email: cached.email,
        organizationId: cached.organizationId,
      };
      return next();
    }

    // Cache MISS: query DB (only if connected)
    if (isConnected()) {
      const user = await User.findById(userId);
      if (!user || !user.isActive) throw new ApiError(401, 'User not found or inactive');
      const session = await authService.cacheSession(user);
      req.user = {
        userId: session.userId,
        id: session.userId,
        role: session.role,
        name: session.name,
        email: session.email,
        organizationId: session.organizationId,
      };
      return next();
    }

    // No DB + no cache: trust token payload minimally
    req.user = {
      userId,
      id: userId,
      role: payload.role,
      name: payload.name || '',
      email: payload.email || '',
      organizationId: payload.organizationId || null,
    };
    return next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
