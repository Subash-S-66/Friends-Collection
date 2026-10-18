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
    enum: ['login', 'notify', 'register'],
    default: 'login'
  },
  used: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '10m' } // Automatically purge expired documents
  }
}, { timestamps: true });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
