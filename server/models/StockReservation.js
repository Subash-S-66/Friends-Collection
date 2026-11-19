const mongoose = require('mongoose');

const stockReservationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'released'],
    default: 'active',
    index: true
  },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Compound indexes for fast stock availability lookups & reservation checks
stockReservationSchema.index({ 'items.product': 1, status: 1, expiresAt: 1 });
stockReservationSchema.index({ sessionId: 1, status: 1 });

// TTL index to automatically purge old records after 24 hours
stockReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('StockReservation', stockReservationSchema);
