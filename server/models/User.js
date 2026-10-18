const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  phone: { type: String, trim: true },
  secondaryPhone: { type: String, trim: true },
  isDefault: { type: Boolean, default: false }
});

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, default: '' },
  price: { type: Number, default: 0 },
  originalPrice: { type: Number, default: 0 },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  quantity: { type: Number, default: 1, min: 1 },
  image: { type: String, default: '' },
  slug: { type: String, default: '' },
  stock: { type: Number, default: 99 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, sparse: true },
  secondaryPhone: { type: String, trim: true, default: '' },
  password: { type: String, minlength: 6, select: false },
  googleId: { type: String, sparse: true },
  authProvider: { type: String, enum: ['local', 'google', 'token'], default: 'local' },
  avatar: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  savedAddresses: [addressSchema],
  cart: [cartItemSchema]
}, { timestamps: true });

// Pre-save hook for password hashing (Bcrypt cost factor 12)
userSchema.pre('save', async function() {
  if (!this.password || !this.isModified('password')) return;
  // Ensure we never double-hash if password is already a valid bcrypt hash
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
});

// Pre-update hooks for query updates (findOneAndUpdate, updateOne)
userSchema.pre(['findOneAndUpdate', 'updateOne'], async function() {
  const update = this.getUpdate();
  if (!update) return;

  if (typeof update.password === 'string' && update.password) {
    if (!update.password.startsWith('$2a$') && !update.password.startsWith('$2b$')) {
      update.password = await bcrypt.hash(update.password, 12);
    }
  }
  if (update.$set && typeof update.$set.password === 'string' && update.$set.password) {
    if (!update.$set.password.startsWith('$2a$') && !update.$set.password.startsWith('$2b$')) {
      update.$set.password = await bcrypt.hash(update.$set.password, 12);
    }
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
