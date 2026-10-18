const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  preheader: {
    type: String,
    trim: true,
    default: ''
  },
  badgeText: {
    type: String,
    default: 'FESTIVE SPECIAL OFFER'
  },
  headline: {
    type: String,
    default: ''
  },
  bannerImage: {
    type: String,
    default: ''
  },
  bodyHtml: {
    type: String,
    required: true
  },
  ctaText: {
    type: String,
    default: 'Explore Festive Collection'
  },
  ctaUrl: {
    type: String,
    default: 'https://friends-collection.vercel.app/shop'
  },
  couponCode: {
    type: String,
    default: ''
  },
  targetAudience: {
    type: String,
    enum: ['all', 'customers', 'waitlist'],
    default: 'all'
  },
  status: {
    type: String,
    enum: ['draft', 'sending', 'sent', 'failed'],
    default: 'draft'
  },
  recipientCount: {
    type: Number,
    default: 0
  },
  sentCount: {
    type: Number,
    default: 0
  },
  totalRecipients: {
    type: Number,
    default: 0
  },
  sentAt: {
    type: Date
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
