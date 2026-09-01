const express = require('express');
const router = express.Router();
const controller = require('../controllers/request.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const rateLimiter = require('../middleware/rateLimiter');
const { ROLES } = require('../utils/constants');

router.post('/', authenticate, authorize(ROLES.CUSTOMER), rateLimiter({ windowMs: 60, max: 10 }), controller.create);
router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.patch('/:id/cancel', authenticate, authorize(ROLES.CUSTOMER), controller.cancel);
router.patch('/:id/review', authenticate, authorize(ROLES.TRUCK_OWNER), controller.review);
router.patch('/:id/reject', authenticate, authorize(ROLES.TRUCK_OWNER), controller.reject);

module.exports = router;
