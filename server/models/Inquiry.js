const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    inquiryId: {
      type: String,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    subject: {
      type: String,
      default: 'General Inquiry',
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'archived'],
      default: 'new'
    },
    metadata: {
      ip: String,
      userAgent: String
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate human-readable inquiry ID: INQ-YYMMDD-XXXX
inquirySchema.pre('validate', function (next) {
  if (!this.inquiryId) {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.inquiryId = `INQ-${dateStr}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
