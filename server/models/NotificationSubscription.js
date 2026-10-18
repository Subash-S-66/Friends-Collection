const mongoose = require('mongoose');

const notificationSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  variant: {
    color: { type: String, default: '' },
    size: { type: String, default: '' }
  },
  notified: {
    type: Boolean,
    default: false,
    index: true
  },
  notifiedAt: {
    type: Date
  }
}, { timestamps: true });

// Prevent duplicate subscriptions for same email + product + variant
notificationSubscriptionSchema.index(
  { email: 1, product: 1, 'variant.color': 1, 'variant.size': 1 },
  { unique: true }
);

module.exports = mongoose.model('NotificationSubscription', notificationSubscriptionSchema);
