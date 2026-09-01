const express = require('express');
const router = express.Router();
const controller = require('../controllers/report.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const cacheMiddleware = require('../middleware/cache');
const { ROLES } = require('../utils/constants');

router.get('/summary', authenticate, authorize(ROLES.TRUCK_OWNER), cacheMiddleware(60), controller.summary);
router.get('/monthly', authenticate, authorize(ROLES.TRUCK_OWNER), cacheMiddleware(60), controller.monthly);

module.exports = router;
