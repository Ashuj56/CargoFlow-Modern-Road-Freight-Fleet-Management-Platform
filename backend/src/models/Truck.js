const mongoose = require('mongoose');
const { TRUCK_TYPE } = require('../utils/constants');

const truckSchema = new mongoose.Schema(
  {
    regNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: Number, default: null },
    type: { type: String, enum: TRUCK_TYPE, required: true },
    capacityTons: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['available', 'assigned', 'maintenance', 'inactive'],
      default: 'available',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

truckSchema.index({ ownerId: 1, status: 1 });
truckSchema.index({ regNumber: 1 }, { unique: true });

module.exports = mongoose.model('Truck', truckSchema);
