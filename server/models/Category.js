const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  gender: { type: String, enum: ['women', 'men', 'kids', 'all'], default: 'women' },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

categorySchema.index({ gender: 1, parent: 1, priority: 1 });
categorySchema.index({ parent: 1, priority: 1 });

module.exports = mongoose.model('Category', categorySchema);
