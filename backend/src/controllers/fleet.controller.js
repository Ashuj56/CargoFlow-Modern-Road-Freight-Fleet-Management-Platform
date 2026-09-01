const Truck = require('../models/Truck');
const Driver = require('../models/Driver');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { isConnected } = require('../config/db');
const { z } = require('zod');
const { TRUCK_TYPE } = require('../utils/constants');

const truckSchema = z.object({
  regNumber: z.string().min(3),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  type: z.enum(TRUCK_TYPE),
  capacityTons: z.number().nonnegative().optional(),
  status: z.enum(['available', 'assigned', 'maintenance', 'inactive']).optional(),
});

const driverSchema = z.object({
  name: z.string().min(2),
  licenseNumber: z.string().min(3),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['available', 'on_duty', 'off_duty']).optional(),
  assignedTruckId: z.string().optional().nullable(),
});

function assertOwner(resource, ownerId) {
  if (resource.ownerId.toString() !== ownerId) throw new ApiError(403, 'Not authorized');
}

// ---------------- TRUCKS ----------------

async function listTrucks(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const trucks = await Truck.find({ ownerId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json(new ApiResponse(200, 'Trucks fetched', { trucks }));
  } catch (err) {
    next(err);
  }
}

async function createTruck(req, res, next) {
  try {
    const body = truckSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const truck = await Truck.create({ ...body, ownerId: req.user.userId });
    res.status(201).json(new ApiResponse(201, 'Truck added', { truck }));
  } catch (err) {
    next(err);
  }
}

async function getTruck(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const truck = await Truck.findById(req.params.id);
    if (!truck) throw new ApiError(404, 'Truck not found');
    assertOwner(truck, req.user.userId);
    res.json(new ApiResponse(200, 'Truck fetched', { truck }));
  } catch (err) {
    next(err);
  }
}

async function updateTruck(req, res, next) {
  try {
    const body = truckSchema.partial().parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const truck = await Truck.findById(req.params.id);
    if (!truck) throw new ApiError(404, 'Truck not found');
    assertOwner(truck, req.user.userId);
    Object.assign(truck, body);
    await truck.save();
    res.json(new ApiResponse(200, 'Truck updated', { truck }));
  } catch (err) {
    next(err);
  }
}

async function deleteTruck(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const truck = await Truck.findById(req.params.id);
    if (!truck) throw new ApiError(404, 'Truck not found');
    assertOwner(truck, req.user.userId);
    await truck.deleteOne();
    res.json(new ApiResponse(200, 'Truck removed'));
  } catch (err) {
    next(err);
  }
}

// ---------------- DRIVERS ----------------

async function listDrivers(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const drivers = await Driver.find({ ownerId: req.user.userId })
      .populate('assignedTruckId', 'regNumber type')
      .sort({ createdAt: -1 })
      .lean();
    res.json(new ApiResponse(200, 'Drivers fetched', { drivers }));
  } catch (err) {
    next(err);
  }
}

async function createDriver(req, res, next) {
  try {
    const body = driverSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const driver = await Driver.create({ ...body, ownerId: req.user.userId });
    res.status(201).json(new ApiResponse(201, 'Driver added', { driver }));
  } catch (err) {
    next(err);
  }
}

async function getDriver(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new ApiError(404, 'Driver not found');
    assertOwner(driver, req.user.userId);
    res.json(new ApiResponse(200, 'Driver fetched', { driver }));
  } catch (err) {
    next(err);
  }
}

async function updateDriver(req, res, next) {
  try {
    const body = driverSchema.partial().parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new ApiError(404, 'Driver not found');
    assertOwner(driver, req.user.userId);
    Object.assign(driver, body);
    await driver.save();
    res.json(new ApiResponse(200, 'Driver updated', { driver }));
  } catch (err) {
    next(err);
  }
}

async function deleteDriver(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const driver = await Driver.findById(req.params.id);
    if (!driver) throw new ApiError(404, 'Driver not found');
    assertOwner(driver, req.user.userId);
    await driver.deleteOne();
    res.json(new ApiResponse(200, 'Driver removed'));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTrucks,
  createTruck,
  getTruck,
  updateTruck,
  deleteTruck,
  listDrivers,
  createDriver,
  getDriver,
  updateDriver,
  deleteDriver,
};
