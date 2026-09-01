const Shipment = require('../models/Shipment');
const Payment = require('../models/Payment');
const Truck = require('../models/Truck');
const ShipmentRequest = require('../models/ShipmentRequest');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { isConnected } = require('../config/db');
const mongoose = require('mongoose');

async function summary(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const ownerId = new mongoose.Types.ObjectId(req.user.userId);

    const [totalTrucks, truckStatus, activeShipments, pendingRequests, revenueAgg, outstandingAgg, deliveredShipments] =
      await Promise.all([
        Truck.countDocuments({ ownerId }),
        Truck.aggregate([
          { $match: { ownerId } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Shipment.countDocuments({ ownerId, status: { $in: ['assigned', 'pickup', 'in_transit'] } }),
        ShipmentRequest.countDocuments({ ownerId, status: { $in: ['pending', 'reviewed', 'quoted'] } }),
        Payment.aggregate([
          { $match: { ownerId, status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$amountINR' } } },
        ]),
        Payment.aggregate([
          { $match: { ownerId, status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amountINR' } } },
        ]),
        Shipment.countDocuments({ ownerId, status: { $in: ['delivered', 'completed'] } }),
      ]);

    const truckStatusMap = truckStatus.reduce((acc, t) => ((acc[t._id] = t.count), acc), {});

    res.json(
      new ApiResponse(200, 'Summary fetched', {
        fleet: {
          totalTrucks,
          available: truckStatusMap.available || 0,
          assigned: truckStatusMap.assigned || 0,
          maintenance: truckStatusMap.maintenance || 0,
          inactive: truckStatusMap.inactive || 0,
        },
        operations: {
          activeShipments,
          pendingRequests,
          deliveredShipments,
        },
        revenue: {
          totalCollectedINR: revenueAgg[0]?.total || 0,
          outstandingINR: outstandingAgg[0]?.total || 0,
        },
      })
    );
  } catch (err) {
    next(err);
  }
}

async function monthly(req, res, next) {
  try {
    if (!isConnected()) throw new ApiError(503, 'Database not connected');
    const ownerId = new mongoose.Types.ObjectId(req.user.userId);

    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const [revenueByMonth, shipmentsByMonth] = await Promise.all([
      Payment.aggregate([
        { $match: { ownerId, status: 'paid', paidAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $month: '$paidAt' },
            total: { $sum: '$amountINR' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Shipment.aggregate([
        { $match: { ownerId, createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenueINR: 0,
      shipments: 0,
    }));

    revenueByMonth.forEach((r) => {
      months[r._id - 1].revenueINR = r.total;
    });
    shipmentsByMonth.forEach((s) => {
      months[s._id - 1].shipments = s.count;
    });

    res.json(new ApiResponse(200, 'Monthly report fetched', { year, months }));
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, monthly };
