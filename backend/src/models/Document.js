const mongoose = require('mongoose');
const { DOCUMENT_TYPE } = require('../utils/constants');

const documentSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    type: { type: String, enum: DOCUMENT_TYPE, required: true },
    filename: { type: String, default: '' },
    url: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

documentSchema.index({ shipmentId: 1 });
documentSchema.index({ type: 1 });

module.exports = mongoose.model('Document', documentSchema);
