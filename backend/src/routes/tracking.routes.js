const express = require('express');
const router = express.Router();
const controller = require('../controllers/tracking.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

// Public tracking by reference code (no auth)
router.get('/tracking/:ref', controller.publicTracking);

// Shipment-scoped tracking (protected)
router.get('/shipments/:id/tracking', authenticate, controller.listEvents);
router.post('/shipments/:id/tracking', authenticate, authorize(ROLES.TRUCK_OWNER), controller.addEvent);

module.exports = router;
