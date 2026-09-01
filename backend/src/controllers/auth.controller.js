const User = require('../models/User');
const Customer = require('../models/Customer');
const Organization = require('../models/Organization');
const authService = require('../services/auth.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');
const { enqueueNotification } = require('../queues/notification.queue');
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([ROLES.CUSTOMER, ROLES.TRUCK_OWNER]),
  companyName: z.string().optional(),
  gstNumber: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ email: z.string().email(), otp: z.string().min(4).max(8), newPassword: z.string().min(8) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });

const COOKIE_NAME = 'refreshToken';

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

async function register(req, res, next) {
  try {
    const body = registerSchema.parse(req.body);

    if (!isConnected()) throw new ApiError(503, 'Database not connected. Configure MONGODB_URI in backend/.env');

    const exists = await User.findOne({ email: body.email });
    if (exists) throw new ApiError(409, 'Email already registered');

    const hashed = await authService.hashPassword(body.password);
    const user = await User.create({
      name: body.name,
      email: body.email,
      password: hashed,
      role: body.role,
    });

    // Create profile based on role
    if (body.role === ROLES.CUSTOMER) {
      await Customer.create({
        userId: user._id,
        companyName: body.companyName || body.name,
        gstNumber: body.gstNumber || '',
        phone: body.phone || '',
      });
    } else {
      const org = await Organization.create({
        name: body.companyName || `${body.name}'s Fleet`,
        type: 'fleet_owner',
        ownerId: user._id,
        contactEmail: body.email,
        contactPhone: body.phone || '',
      });
      user.organizationId = org._id;
      await user.save();
    }

    await authService.cacheSession(user);

    const accessToken = authService.signAccessToken({ userId: user._id.toString(), role: user.role, name: user.name, email: user.email, organizationId: user.organizationId?.toString() || null });
    const refreshToken = authService.signRefreshToken({ userId: user._id.toString() });

    setRefreshCookie(res, refreshToken);

    res.status(201).json(new ApiResponse(201, 'Account created', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId },
    }));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const user = await User.findOne({ email: body.email }).select('+password');
    if (!user) throw new ApiError(401, 'Invalid email or password');
    if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

    const valid = await authService.comparePassword(body.password, user.password);
    if (!valid) throw new ApiError(401, 'Invalid email or password');

    await user.updateOne({ lastLogin: new Date() });
    await authService.cacheSession(user);

    const accessToken = authService.signAccessToken({ userId: user._id.toString(), role: user.role, name: user.name, email: user.email, organizationId: user.organizationId?.toString() || null });
    const refreshToken = authService.signRefreshToken({ userId: user._id.toString() });

    setRefreshCookie(res, refreshToken);

    res.json(new ApiResponse(200, 'Login successful', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId },
    }));
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user && req.user.userId) {
      await authService.clearSession(req.user.userId);
    }
    clearRefreshCookie(res);
    res.json(new ApiResponse(200, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    if (!token) throw new ApiError(401, 'No refresh token');

    let payload;
    try {
      payload = authService.verifyRefreshToken(token);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const userId = payload.userId;
    await authService.refreshSessionTtl(userId);

    const accessToken = authService.signAccessToken({ userId });
    res.json(new ApiResponse(200, 'Token refreshed', { accessToken }));
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    res.json(new ApiResponse(200, 'User profile', { user }));
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const body = forgotSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const user = await User.findOne({ email: body.email });
    if (!user) {
      // Don't reveal whether email exists
      return res.json(new ApiResponse(200, 'If that email is registered, an OTP has been sent'));
    }

    const otp = authService.generateOTP();
    await authService.storeOTP(body.email, otp);

    await enqueueNotification('email.otp', { email: body.email, otp, name: user.name });

    res.json(new ApiResponse(200, 'If that email is registered, an OTP has been sent'));
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const body = resetSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const storedOtp = await authService.getOTP(body.email);
    if (!storedOtp || storedOtp !== body.otp) throw new ApiError(400, 'Invalid or expired OTP');

    const user = await User.findOne({ email: body.email });
    if (!user) throw new ApiError(404, 'User not found');

    const hashed = await authService.hashPassword(body.newPassword);
    user.password = hashed;
    await user.save();

    await authService.clearOTP(body.email);
    await authService.clearSession(user._id.toString());

    res.json(new ApiResponse(200, 'Password reset successfully. Please login.'));
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const body = changePasswordSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) throw new ApiError(404, 'User not found');

    const valid = await authService.comparePassword(body.currentPassword, user.password);
    if (!valid) throw new ApiError(400, 'Current password is incorrect');

    user.password = await authService.hashPassword(body.newPassword);
    await user.save();

    await authService.clearSession(user._id.toString());

    res.json(new ApiResponse(200, 'Password changed successfully'));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
};
