const express = require('express');
const router = express.Router();
const controller = require('../controllers/fleet.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

// Trucks
router.get('/trucks', authenticate, authorize(ROLES.TRUCK_OWNER), controller.listTrucks);
router.post('/trucks', authenticate, authorize(ROLES.TRUCK_OWNER), controller.createTruck);
router.get('/trucks/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.getTruck);
router.patch('/trucks/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.updateTruck);
router.delete('/trucks/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.deleteTruck);

// Drivers
router.get('/drivers', authenticate, authorize(ROLES.TRUCK_OWNER), controller.listDrivers);
router.post('/drivers', authenticate, authorize(ROLES.TRUCK_OWNER), controller.createDriver);
router.get('/drivers/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.getDriver);
router.patch('/drivers/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.updateDriver);
router.delete('/drivers/:id', authenticate, authorize(ROLES.TRUCK_OWNER), controller.deleteDriver);

module.exports = router;
