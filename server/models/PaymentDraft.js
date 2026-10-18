const mongoose = require('mongoose');

const paymentDraftItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' }
}, { _id: false });

const paymentDraftSchema = new mongoose.Schema({
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: [paymentDraftItemSchema],
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    secondaryPhone: { type: String, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  totalAmount: {
    type: Number,
    required: true
  },
  shippingCharge: {
    type: Number,
    default: 0
  },
  grandTotalPaise: {
    type: Number,
    required: true
  },
  sessionId: {
    type: String,
    default: ''
  },
  saveAddress: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // Automatically expire from MongoDB after 30 minutes
  }
});

module.exports = mongoose.model('PaymentDraft', paymentDraftSchema);
