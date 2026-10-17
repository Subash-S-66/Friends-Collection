const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  image: { type: String, required: true },
  ctaText: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/shop' },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
