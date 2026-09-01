const mongoose = require('mongoose');
const { SHIPMENT_STATUS } = require('../utils/constants');

const shipmentSchema = new mongoose.Schema(
  {
    trackingRef: { type: String, required: true, unique: true, trim: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShipmentRequest', required: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    status: { type: String, enum: Object.values(SHIPMENT_STATUS), default: 'confirmed' },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
    estimatedDelivery: { type: Date, default: null },
    actualDelivery: { type: Date, default: null },
  },
  { timestamps: true }
);

shipmentSchema.index({ trackingRef: 1 }, { unique: true });
shipmentSchema.index({ customerId: 1 });
shipmentSchema.index({ ownerId: 1 });
shipmentSchema.index({ status: 1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
