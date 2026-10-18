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
    name: { type: String, required: true },
    phone: { type: String, required: true },
    secondaryPhone: { type: String, trim: true, default: '' },
    email: { type: String, default: '' },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }
    }
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  totalAmount: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  notes: { type: String, default: '' },
  paymentMethod: { type: String, default: 'cod' },
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

module.exports = mongoose.model('Order', orderSchema);
