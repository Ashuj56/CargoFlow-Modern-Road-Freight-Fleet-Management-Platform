const express = require('express');
const router = express.Router();
const controller = require('../controllers/payment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.patch('/:id/mark-paid', authenticate, authorize(ROLES.TRUCK_OWNER), controller.markPaid);

module.exports = router;
