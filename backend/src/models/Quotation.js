const mongoose = require('mongoose');
const { QUOTATION_STATUS } = require('../utils/constants');

const quotationSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShipmentRequest', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lineItems: [
      {
        label: { type: String, required: true },
        amountINR: { type: Number, required: true, min: 0 },
      },
    ],
    totalAmountINR: { type: Number, required: true, min: 0 },
    includesGST: { type: Boolean, default: true },
    gstPercent: { type: Number, default: 18 },
    validUntil: { type: Date, default: null },
    notes: { type: String, default: '' },
    status: { type: String, enum: Object.values(QUOTATION_STATUS), default: 'sent' },
  },
  { timestamps: true }
);

quotationSchema.index({ requestId: 1 });
quotationSchema.index({ ownerId: 1 });
quotationSchema.index({ status: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
