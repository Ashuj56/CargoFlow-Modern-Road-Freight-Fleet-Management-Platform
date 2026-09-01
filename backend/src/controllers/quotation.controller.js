const Quotation = require('../models/Quotation');
const ShipmentRequest = require('../models/ShipmentRequest');
const Customer = require('../models/Customer');
const shipmentService = require('../services/shipment.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');
const { z } = require('zod');
const { enqueueNotification } = require('../queues/notification.queue');
const { emitToUser } = require('../socket');

const createSchema = z.object({
  requestId: z.string().min(1),
  lineItems: z
    .array(z.object({ label: z.string().min(1), amountINR: z.number().nonnegative() }))
    .min(1),
  includesGST: z.boolean().optional(),
  gstPercent: z.number().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

async function create(req, res, next) {
  try {
    const body = createSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const request = await ShipmentRequest.findById(body.requestId);
    if (!request) throw new ApiError(404, 'Shipment request not found');
    if (request.ownerId.toString() !== req.user.userId.toString())
      throw new ApiError(403, 'You can only quote on requests assigned to you');

    // Can't quote if already accepted/rejected/cancelled
    if (['accepted', 'rejected', 'cancelled'].includes(request.status))
      throw new ApiError(400, `Cannot quote a request in status "${request.status}"`);

    // Optionally allow re-quote after decline
    const totalAmountINR = body.lineItems.reduce((s, it) => s + it.amountINR, 0);

    const quotation = await Quotation.create({
      requestId: body.requestId,
      ownerId: req.user.userId,
      lineItems: body.lineItems,
      totalAmountINR,
      includesGST: body.includesGST !== undefined ? body.includesGST : true,
      gstPercent: body.gstPercent || 18,
      validUntil: body.validUntil || null,
      notes: body.notes || '',
    });

    request.status = 'quoted';
    await request.save();

    // Notify customer
    const customer = await Customer.findById(request.customerId).populate('userId', 'email name');
    emitToUser(customer.userId?._id?.toString(), 'quotation:received', {
      quotationId: quotation._id,
      totalAmountINR,
    });
    await enqueueNotification('email.quotation_sent', {
      customerEmail: customer.userId?.email,
      quotationId: quotation._id,
      totalAmountINR,
    });

    res.status(201).json(new ApiResponse(201, 'Quotation sent', { quotation }));
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    let quotations;
    if (req.user.role === ROLES.TRUCK_OWNER) {
      quotations = await Quotation.find({ ownerId: req.user.userId }).populate('requestId').sort({ createdAt: -1 }).lean();
    } else {
      const customer = await Customer.findOne({ userId: req.user.userId });
      const requests = customer ? await ShipmentRequest.find({ customerId: customer._id }).select('_id') : [];
      const requestIds = requests.map((r) => r._id);
      quotations = await Quotation.find({ requestId: { $in: requestIds } })
        .populate('requestId', 'pickup destination status')
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json(new ApiResponse(200, 'Quotations fetched', { quotations }));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const quotation = await Quotation.findById(req.params.id)
      .populate('requestId')
      .populate('ownerId', 'name email')
      .lean();
    if (!quotation) throw new ApiError(404, 'Quotation not found');

    // Authz check
    if (req.user.role === ROLES.TRUCK_OWNER) {
      if (quotation.ownerId._id.toString() !== req.user.userId.toString())
        throw new ApiError(403, 'Not authorized');
    } else {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer || quotation.requestId.customerId.toString() !== customer._id.toString())
        throw new ApiError(403, 'Not authorized');
    }

    res.json(new ApiResponse(200, 'Quotation fetched', { quotation }));
  } catch (err) {
    next(err);
  }
}

async function accept(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) throw new ApiError(404, 'Quotation not found');

    // Only the customer of the associated request can accept
    const request = await ShipmentRequest.findById(quotation.requestId);
    if (!request) throw new ApiError(404, 'Request not found');
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!customer || request.customerId.toString() !== customer._id.toString())
      throw new ApiError(403, 'Not authorized to accept this quotation');

    if (quotation.status !== 'sent') throw new ApiError(400, 'Only sent quotations can be accepted');

    quotation.status = 'accepted';
    await quotation.save();

    request.status = 'accepted';
    await request.save();

    // Auto-create shipment + payment
    const shipment = await shipmentService.createFromQuotation(quotation, request);

    // Update request status to quoted->accepted already done
    // Notify owner
    emitToUser(quotation.ownerId.toString(), 'quotation:response', {
      quotationId: quotation._id,
      status: 'accepted',
    });
    await enqueueNotification('email.quotation_accepted', { ownerEmail: req.user.email });
    await enqueueNotification('email.shipment_confirmed', {
      customerEmail: req.user.email,
      shipmentId: shipment._id,
    });

    res.json(new ApiResponse(200, 'Quotation accepted, shipment created', { quotation, shipment }));
  } catch (err) {
    next(err);
  }
}

async function decline(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) throw new ApiError(404, 'Quotation not found');

    const request = await ShipmentRequest.findById(quotation.requestId);
    const customer = await Customer.findOne({ userId: req.user.userId });
    if (!request || !customer || request.customerId.toString() !== customer._id.toString())
      throw new ApiError(403, 'Not authorized to decline this quotation');

    if (quotation.status !== 'sent') throw new ApiError(400, 'Only sent quotations can be declined');

    quotation.status = 'declined';
    await quotation.save();

    // Reset request to pending so owner can re-quote
    request.status = 'pending';
    await request.save();

    emitToUser(quotation.ownerId.toString(), 'quotation:response', {
      quotationId: quotation._id,
      status: 'declined',
    });

    res.json(new ApiResponse(200, 'Quotation declined', { quotation }));
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, accept, decline };
