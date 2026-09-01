const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: { type: String, default: '', trim: true },
    gstNumber: { type: String, default: '', uppercase: true },
    billingAddress: { type: String, default: '' },
    phone: { type: String, default: '' },
    totalShipments: { type: Number, default: 0 },
    totalSpendINR: { type: Number, default: 0 },
  },
  { timestamps: true }
);

customerSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
