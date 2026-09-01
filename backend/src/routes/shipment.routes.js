const express = require('express');
const router = express.Router();
const controller = require('../controllers/shipment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.patch('/:id/assign', authenticate, authorize(ROLES.TRUCK_OWNER), controller.assign);
router.patch('/:id/status', authenticate, authorize(ROLES.TRUCK_OWNER), controller.updateStatus);
router.patch('/:id/complete', authenticate, authorize(ROLES.TRUCK_OWNER), controller.complete);

module.exports = router;
