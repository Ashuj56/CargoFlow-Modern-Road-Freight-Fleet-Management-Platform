const Payment = require('../models/Payment');
const Shipment = require('../models/Shipment');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');
const { z } = require('zod');
const { emitToRoom } = require('../socket');

const markSchema = z.object({ method: z.string().optional() });

async function list(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const { status } = req.query;
    const filter = {};
    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer) throw new ApiError(404, 'Customer profile not found');
      filter.customerId = customer._id;
    } else {
      filter.ownerId = req.user.userId;
    }
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .populate('shipmentId', 'trackingRef status')
      .sort({ createdAt: -1 })
      .lean();

    res.json(new ApiResponse(200, 'Payments fetched', { payments }));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const payment = await Payment.findById(req.params.id).populate('shipmentId', 'trackingRef status').lean();
    if (!payment) throw new ApiError(404, 'Payment not found');

    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer || payment.customerId.toString() !== customer._id.toString())
        throw new ApiError(403, 'Not authorized');
    } else if (payment.ownerId.toString() !== req.user.userId.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    res.json(new ApiResponse(200, 'Payment fetched', { payment }));
  } catch (err) {
    next(err);
  }
}

async function markPaid(req, res, next) {
  try {
    const body = markSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.ownerId.toString() !== req.user.userId.toString())
      throw new ApiError(403, 'Not authorized to mark this payment');

    if (payment.status === 'paid') throw new ApiError(400, 'Payment already marked as paid');

    payment.status = 'paid';
    payment.method = body.method || 'mock';
    payment.paidAt = new Date();
    await payment.save();

    // Notify shipment room
    emitToRoom(`shipment:${payment.shipmentId}`, 'shipment:status', {
      shipmentId: payment.shipmentId,
      newStatus: 'paid',
    });

    res.json(new ApiResponse(200, 'Payment marked as paid', { payment }));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, markPaid };
