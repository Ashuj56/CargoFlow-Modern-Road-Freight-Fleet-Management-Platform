const ShipmentRequest = require('../models/ShipmentRequest');
const Customer = require('../models/Customer');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');
const { z } = require('zod');
const { enqueueNotification } = require('../queues/notification.queue');
const { emitToUser } = require('../socket');

const createSchema = z.object({
  ownerId: z.string().min(1, 'ownerId is required'),
  pickup: z.object({ address: z.string().min(1), city: z.string().min(1), lat: z.number().optional(), lng: z.number().optional() }),
  destination: z.object({ address: z.string().min(1), city: z.string().min(1), lat: z.number().optional(), lng: z.number().optional() }),
  cargoType: z.string().min(1),
  cargoDescription: z.string().optional(),
  weightKg: z.number().positive(),
  units: z.number().int().positive().optional(),
  vehicleType: z.string().optional(),
  pickupDate: z.string().min(1),
  additionalRequirements: z.string().optional(),
  estimatedDistanceKm: z.number().optional(),
});

async function create(req, res, next) {
  try {
    const body = createSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    // Resolve customer profile
    let customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer) throw new ApiError(404, 'Customer profile not found');

    const request = await ShipmentRequest.create({
      customerId: customer._id,
      ownerId: body.ownerId,
      pickup: body.pickup,
      destination: body.destination,
      estimatedDistanceKm: body.estimatedDistanceKm || 0,
      cargoType: body.cargoType,
      cargoDescription: body.cargoDescription || '',
      weightKg: body.weightKg,
      units: body.units || 1,
      vehicleType: body.vehicleType || 'medium',
      pickupDate: body.pickupDate,
      additionalRequirements: body.additionalRequirements || '',
    });

    // Notify owner
    const route = `${body.pickup.city} → ${body.destination.city}`;
    emitToUser(body.ownerId, 'request:new', {
      requestId: request._id,
      route,
      cargoType: body.cargoType,
      weightKg: body.weightKg,
    });

    const owner = await User.findById(body.ownerId);
    await enqueueNotification('email.request_received', {
      ownerEmail: owner?.email,
      requestId: request._id,
      route,
      cargoType: body.cargoType,
      weightKg: body.weightKg,
    });

    res.status(201).json(new ApiResponse(201, 'Shipment request created', { request }));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (customer) filter.customerId = customer._id;
    } else {
      filter.ownerId = req.user.userId;
    }
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      ShipmentRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ShipmentRequest.countDocuments(filter),
    ]);

    // Populate customer/organization info for display
    const populated = await Promise.all(
      docs.map(async (d) => {
        let customerInfo = null;
        if (req.user.role === ROLES.TRUCK_OWNER && d.customerId) {
          const cust = await Customer.findById(d.customerId).populate('userId', 'name email');
          customerInfo = cust ? { companyName: cust.companyName, name: cust.userId?.name, email: cust.userId?.email } : null;
        }
        return { ...d, customerInfo };
      })
    );

    res.json(new ApiResponse(200, 'Shipment requests fetched', populated, { page: Number(page), limit: Number(limit), total }));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const request = await ShipmentRequest.findById(req.params.id).lean();
    if (!request) throw new ApiError(404, 'Request not found');

    // Authz
    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer || request.customerId.toString() !== customer._id.toString())
        throw new ApiError(403, 'Not authorized');
    } else if (request.ownerId.toString() !== req.user.userId.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    res.json(new ApiResponse(200, 'Request fetched', { request }));
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const request = await ShipmentRequest.findById(req.params.id);
    if (!request) throw new ApiError(404, 'Request not found');

    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || request.customerId.toString() !== customer._id.toString())
      throw new ApiError(403, 'Not authorized to cancel this request');

    if (!['pending', 'reviewed', 'quoted'].includes(request.status))
      throw new ApiError(400, `Cannot cancel request in status "${request.status}"`);

    request.status = 'cancelled';
    await request.save();

    res.json(new ApiResponse(200, 'Request cancelled', { request }));
  } catch (err) {
    next(err);
  }
}

async function review(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const request = await ShipmentRequest.findById(req.params.id);
    if (!request) throw new ApiError(404, 'Request not found');
    if (request.ownerId.toString() !== req.user.userId.toString())
      throw new ApiError(403, 'Not authorized');

    if (request.status !== 'pending') throw new ApiError(400, 'Only pending requests can be reviewed');

    request.status = 'reviewed';
    await request.save();

    res.json(new ApiResponse(200, 'Request marked as reviewed', { request }));
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const { reason } = req.body;
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const request = await ShipmentRequest.findById(req.params.id);
    if (!request) throw new ApiError(404, 'Request not found');
    if (request.ownerId.toString() !== req.user.userId.toString())
      throw new ApiError(403, 'Not authorized');

    if (!['pending', 'reviewed'].includes(request.status))
      throw new ApiError(400, 'Cannot reject request in this status');

    request.status = 'rejected';
    request.rejectionReason = reason || 'No longer accepting this request';
    await request.save();

    res.json(new ApiResponse(200, 'Request rejected', { request }));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, cancel, review, reject };
