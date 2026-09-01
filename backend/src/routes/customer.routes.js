const express = require('express');
const router = express.Router();
const controller = require('../controllers/customer.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

router.get('/', authenticate, authorize(ROLES.TRUCK_OWNER), controller.list);
router.get('/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.getById);

module.exports = router;
