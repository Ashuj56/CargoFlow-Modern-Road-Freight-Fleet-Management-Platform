const TrackingEvent = require('../models/TrackingEvent');
const Shipment = require('../models/Shipment');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { isConnected } = require('../config/db');
const { z } = require('zod');
const { emitToRoom } = require('../socket');

const addSchema = z.object({
  status: z.string().min(1),
  location: z.object({ lat: z.number(), lng: z.number(), address: z.string().optional() }),
  note: z.string().optional(),
});

async function listEvents(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) throw new ApiError(404, 'Shipment not found');

    // Authz
    if (req.user.role === ROLES.CUSTOMER) {
      const customer = await Customer.findOne({ userId: req.user.userId });
      if (!customer || shipment.customerId.toString() !== customer._id.toString())
        throw new ApiError(403, 'Not authorized');
    } else if (shipment.ownerId.toString() !== req.user.userId.toString()) {
      throw new ApiError(403, 'Not authorized');
    }

    const events = await TrackingEvent.find({ shipmentId: shipment._id })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json(new ApiResponse(200, 'Tracking events fetched', { events }));
  } catch (err) {
    next(err);
  }
}

async function addEvent(req, res, next) {
  try {
    const body = addSchema.parse(req.body);
    if (!isConnected()) throw new ApiError(503, 'Database not connected');

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) throw new ApiError(404, 'Shipment not found');
    if (shipment.ownerId.toString() !== req.user.userId.toString())
      throw new ApiError(403, 'Not authorized to add tracking events');

    const event = await TrackingEvent.create({
      shipmentId: shipment._id,
      status: body.status,
      location: body.location,
      note: body.note || '',
      recordedBy: req.user.userId,
    });

    // Emit real-time tracking update to room
    emitToRoom(`shipment:${shipment._id}`, 'tracking:update', {
      shipmentId: shipment._id,
      eventId: event._id,
      location: event.location,
      status: event.status,
      timestamp: event.timestamp,
      note: event.note,
    });

    res.status(201).json(new ApiResponse(201, 'Tracking event added', { event }));
  } catch (err) {
    next(err);
  }
}

async function publicTracking(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const shipment = await Shipment.findOne({ trackingRef: { $regex: `^${req.params.ref}$`, $options: 'i' } })
      .populate('truckId', 'regNumber type make model')
      .populate('driverId', 'name phone')
      .populate('requestId', 'pickup destination')
      .lean();
    if (!shipment) throw new ApiError(404, 'Shipment not found for this reference');

    const events = await TrackingEvent.find({ shipmentId: shipment._id }).sort({ timestamp: -1 }).limit(50).lean();

    res.json(new ApiResponse(200, 'Public tracking data', {
      shipment: {
        trackingRef: shipment.trackingRef,
        status: shipment.status,
        pickup: shipment.requestId?.pickup,
        destination: shipment.requestId?.destination,
        truck: shipment.truckId,
        driver: shipment.driverId,
        timeline: shipment.timeline,
      },
      events,
    }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listEvents, addEvent, publicTracking };
