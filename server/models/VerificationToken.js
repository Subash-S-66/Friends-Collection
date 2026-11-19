const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['login', 'notify', 'register', 'forgot-password', 'verify-email', 'change-email', 'signature-change'],
    default: 'login'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  used: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Purge expired documents automatically as soon as expiresAt is reached
  }
}, { timestamps: true });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
