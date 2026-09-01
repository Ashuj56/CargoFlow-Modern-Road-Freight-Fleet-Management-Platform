const Document = require('../models/Document');
const Shipment = require('../models/Shipment');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');

async function list(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const filter = {};
    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer) throw new ApiError(404, 'Customer profile not found');
      const shipments = await Shipment.find({ customerId: customer._id }).select('_id');
      filter.shipmentId = { $in: shipments.map((s) => s._id) };
    } else {
      const shipments = await Shipment.find({ ownerId: req.user.userId }).select('_id');
      filter.shipmentId = { $in: shipments.map((s) => s._id) };
    }

    const docs = await Document.find(filter)
      .populate('shipmentId', 'trackingRef')
      .sort({ createdAt: -1 })
      .lean();

    res.json(new ApiResponse(200, 'Documents fetched', { documents: docs }));
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
