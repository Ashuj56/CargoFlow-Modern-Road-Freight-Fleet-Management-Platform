const Shipment = require('../models/Shipment');
const Customer = require('../models/Customer');
const shipmentService = require('../services/shipment.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES, SHIPMENT_STATUS } = require('../utils/constants');
const { isConnected } = require('../config/db');
const { z } = require('zod');
const { enqueueNotification } = require('../queues/notification.queue');
const { enqueueDocument } = require('../queues/workers/document.worker');
const { emitToRoom, emitToUser } = require('../socket');

const assignSchema = z.object({
  truckId: z.string().min(1),
  driverId: z.string().min(1),
});
const statusSchema = z.object({ status: z.string().min(1), note: z.string().optional() });

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

    const shipments = await Shipment.find(filter)
      .populate('truckId', 'regNumber type make model')
      .populate('driverId', 'name phone')
      .populate('requestId', 'pickup destination cargoType weightKg estimatedDistanceKm')
      .populate('customerId', 'companyName')
      .sort({ createdAt: -1 })
      .lean();

    res.json(new ApiResponse(200, 'Shipments fetched', { shipments }));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const shipment = await Shipment.findById(req.params.id)
      .populate('truckId')
      .populate('driverId')
      .populate('requestId')
      .populate('quotationId')
      .lean();
    if (!shipment) throw new ApiError(404, 'Shipment not found');

    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer || shipment.customerId.toString() !== customer._id.toString())
        throw new ApiError(403, 'Not authorized');
    } else if (shipment.ownerId.toString() !== req.user.userId.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    res.json(new ApiResponse(200, 'Shipment fetched', { shipment }));
  } catch (err) {
    next(err);
  }
}

async function assign(req, res, next) {
  try {
    const body = assignSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const shipment = await shipmentService.assign({
      shipmentId: req.params.id,
      ownerId: req.user.userId,
      truckId: body.truckId,
      driverId: body.driverId,
    });

    emitToRoom(`shipment:${shipment._id}`, 'shipment:status', {
      shipmentId: shipment._id,
      newStatus: shipment.status,
      trackingRef: shipment.trackingRef,
    });

    res.json(new ApiResponse(200, 'Shipment assigned', { shipment }));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const body = statusSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const shipment = await shipmentService.updateStatus({
      shipmentId: req.params.id,
      ownerId: req.user.userId,
      status: body.status,
      note: body.note,
    });

    emitToRoom(`shipment:${shipment._id}`, 'shipment:status', {
      shipmentId: shipment._id,
      newStatus: shipment.status,
      trackingRef: shipment.trackingRef,
    });

    // Email customer on status change
    const customer = await Customer.findById(shipment.customerId).populate('userId', 'email');
    await enqueueNotification('email.status_update', {
      customerEmail: customer?.userId?.email,
      trackingRef: shipment.trackingRef,
      status: shipment.status,
    });

    // When delivered: generate invoice
    if (shipment.status === SHIPMENT_STATUS.DELIVERED) {
      await enqueueDocument('pdf.generate_invoice', {
        shipmentId: shipment._id,
        uploadedBy: req.user.userId,
      });
      const cust = customer?.userId;
      await enqueueNotification('email.invoice_ready', {
        customerEmail: cust?.email,
        trackingRef: shipment.trackingRef,
        invoiceUrl: '',
      });
    }

    res.json(new ApiResponse(200, 'Shipment status updated', { shipment }));
  } catch (err) {
    next(err);
  }
}

async function complete(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const shipment = await shipmentService.complete({
      shipmentId: req.params.id,
      ownerId: req.user.userId,
    });

    emitToRoom(`shipment:${shipment._id}`, 'shipment:status', {
      shipmentId: shipment._id,
      newStatus: shipment.status,
      trackingRef: shipment.trackingRef,
    });

    res.json(new ApiResponse(200, 'Shipment completed', { shipment }));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, assign, updateStatus, complete };
