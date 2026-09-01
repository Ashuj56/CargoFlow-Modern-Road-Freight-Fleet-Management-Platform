const Customer = require('../models/Customer');
const Shipment = require('../models/Shipment');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { isConnected } = require('../config/db');

async function list(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const customers = await Customer.find()
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    // For each customer, count shipments belonging to this owner
    const result = await Promise.all(
      customers.map(async (c) => {
        const shipmentCount = await Shipment.countDocuments({ customerId: c._id, ownerId: req.user.userId });
        return { ...c, shipmentCount };
      })
    );

    res.json(new ApiResponse(200, 'Customers fetched', { customers: result }));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const customer = await Customer.findById(req.params.id).populate('userId', 'name email');
    if (!customer) throw new ApiError(404, 'Customer not found');

    const shipments = await Shipment.find({ customerId: customer._id, ownerId: req.user.userId })
      .populate('truckId', 'regNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.json(new ApiResponse(200, 'Customer fetched', { customer, shipments }));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
