const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' }
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  items: [orderItemSchema],
  customer: {
    name: { type: String, required: [true, 'Customer name is required'], trim: true },
    phone: {
      type: String,
      required: [true, 'Customer mobile number is mandatory to place an order'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number']
    },
    secondaryPhone: { type: String, trim: true, default: '' },
    email: {
      type: String,
      required: [true, 'Customer email address is mandatory to place an order'],
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address']
    },
    address: {
      street: { type: String, required: [true, 'Street address is required'], trim: true },
      city: { type: String, required: [true, 'City is required'], trim: true },
      state: { type: String, required: [true, 'State is required'], trim: true },
      pincode: {
        type: String,
        required: [true, 'Postal pincode is required'],
        trim: true,
        match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
      }
    }
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  totalAmount: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'yet_to_move', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'yet_to_move'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'payment_pending', 'paid', 'failed', 'refunded'],
    default: 'payment_pending'
  },
  paidAt: { type: Date },
  paymentNotes: { type: String, default: '' },
  notes: { type: String, default: '' },
  paymentMethod: { type: String, default: 'cod' },
  paymentDetails: {
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' }
  },
  tracking: {
    courier: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    trackingUrl: { type: String, default: '' },
    estimatedDelivery: { type: String, default: '' },
    notes: { type: String, default: '' },
    statusHistory: [{
      status: { type: String },
      message: { type: String, default: '' },
      location: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now }
    }]
  }
}, { timestamps: true });

orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `FC-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
