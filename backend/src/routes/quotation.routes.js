const express = require('express');
const router = express.Router();
const controller = require('../controllers/quotation.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

router.post('/', authenticate, authorize(ROLES.TRUCK_OWNER), controller.create);
router.get('/', authenticate, controller.list);
router.get('/:id', authenticate, controller.getById);
router.patch('/:id/accept', authenticate, authorize(ROLES.CUSTOMER), controller.accept);
router.patch('/:id/decline', authenticate, authorize(ROLES.CUSTOMER), controller.decline);

module.exports = router;
