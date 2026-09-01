const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Driver name is required'], trim: true },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    status: { type: String, enum: ['available', 'on_duty', 'off_duty'], default: 'available' },
    assignedTruckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck', default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

driverSchema.index({ ownerId: 1, status: 1 });
driverSchema.index({ licenseNumber: 1 }, { unique: true });

module.exports = mongoose.model('Driver', driverSchema);
