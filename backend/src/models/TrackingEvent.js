const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    status: { type: String, required: true },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      address: { type: String, default: '' },
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

trackingEventSchema.index({ shipmentId: 1 });
trackingEventSchema.index({ timestamp: -1 });
// TTL index: auto-delete after 90 days
trackingEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('TrackingEvent', trackingEventSchema);
