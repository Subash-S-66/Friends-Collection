const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, default: null, min: 0 },
  images: [{ type: String }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  gender: { type: String, enum: ['women', 'men', 'kids', 'unisex', 'all'], default: 'women' },
  sizes: [{ type: String }],
  colors: [{ type: String }],
  variants: [{
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, default: '' }
  }],
  stock: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  tags: [{ type: String }],
  views: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }

  // Synchronize total product stock with variants whenever variants exist
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }

  next();
});

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ gender: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ subcategory: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
