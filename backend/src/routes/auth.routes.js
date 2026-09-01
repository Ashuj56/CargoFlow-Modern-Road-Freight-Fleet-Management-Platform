const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/register', rateLimiter({ windowMs: 60, max: 10 }), auth.register);
router.post('/login', rateLimiter({ windowMs: 60, max: 10 }), auth.login);
router.post('/logout', authenticate, auth.logout);
router.post('/refresh', auth.refresh);
router.get('/me', authenticate, auth.me);
router.post('/forgot-password', rateLimiter({ windowMs: 60, max: 5 }), auth.forgotPassword);
router.post('/reset-password', rateLimiter({ windowMs: 60, max: 5 }), auth.resetPassword);
router.patch('/change-password', authenticate, auth.changePassword);

module.exports = router;
