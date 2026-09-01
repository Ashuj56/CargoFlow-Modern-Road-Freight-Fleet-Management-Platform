const mongoose = require('mongoose');
const { ORG_TYPE } = require('../utils/constants');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Organization name is required'], trim: true },
    type: { type: String, enum: ORG_TYPE, default: 'fleet_owner' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

organizationSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
