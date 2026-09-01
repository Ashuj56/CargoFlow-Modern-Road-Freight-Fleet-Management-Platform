const mongoose = require('mongoose');
const { CARGO_TYPE, VEHICLE_TYPE, REQUEST_STATUS } = require('../utils/constants');

const shipmentRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pickup: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    destination: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    estimatedDistanceKm: { type: Number, default: 0 },
    cargoType: { type: String, enum: CARGO_TYPE, required: true },
    cargoDescription: { type: String, default: '' },
    weightKg: { type: Number, required: true, min: 0 },
    units: { type: Number, default: 1, min: 0 },
    vehicleType: { type: String, enum: VEHICLE_TYPE, default: 'medium' },
    pickupDate: { type: Date, required: true },
    additionalRequirements: { type: String, default: '' },
    status: { type: String, enum: Object.values(REQUEST_STATUS), default: 'pending' },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

shipmentRequestSchema.index({ customerId: 1 });
shipmentRequestSchema.index({ ownerId: 1 });
shipmentRequestSchema.index({ status: 1 });
shipmentRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShipmentRequest', shipmentRequestSchema);
