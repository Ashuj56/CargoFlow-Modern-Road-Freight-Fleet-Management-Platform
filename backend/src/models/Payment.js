const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_METHOD } = require('../utils/constants');

const paymentSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountINR: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: 'pending' },
    method: { type: String, enum: Object.values(PAYMENT_METHOD), default: 'mock' },
    invoiceNumber: { type: String, unique: true, trim: true },
    dueDate: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ shipmentId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ ownerId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
