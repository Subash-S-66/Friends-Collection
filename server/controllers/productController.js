const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadAndProcessImage } = require('../config/cloudinary');

// @desc    Get all products (public)
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, subcategory, gender, search, sort, minPrice, maxPrice, inStock, color, size, page = 1, limit = 12, tag } = req.query;
    const query = { isActive: true };

    // Gender filter (women, men, unisex)
    if (gender && gender !== 'all') {
      query.gender = { $in: [gender, 'unisex'] };
    }

    // Category filter
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category = cat._id;
      else if (category.match(/^[0-9a-fA-F]{24}$/)) query.category = category;
    }

    // Subcategory filter
    if (subcategory) {
      const sub = await Category.findOne({ slug: subcategory });
      if (sub) query.subcategory = sub._id;
      else if (subcategory.match(/^[0-9a-fA-F]{24}$/)) query.subcategory = subcategory;
    }

    // In-Stock only filter (Flipkart style)
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Color filter
    if (color) {
      query.colors = { $in: [color] };
    }

    // Size filter
    if (size) {
      query.sizes = { $in: [size] };
    }

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Tag filter
    if (tag) {
      query.tags = { $in: [tag] };
    }

    // Sort
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc' || sort === 'price-low') sortOption = { price: 1 };
    else if (sort === 'price-desc' || sort === 'price-high') sortOption = { price: -1 };
    else if (sort === 'popular') sortOption = { views: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      products,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/:slug
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured/list
exports.getFeatured = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .sort({ createdAt: -1 })
      .limit(8);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Get related products
// @route   GET /api/products/:slug/related
exports.getRelated = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .limit(4);

    res.json(related);
  } catch (error) {
    next(error);
  }
};

// === ADMIN ===

// @desc    Get all products (admin, includes inactive and variants)
// @route   GET /api/products/admin/all
exports.adminGetProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, category, subcategory, gender } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $in: [search.toLowerCase()] } }
      ];
    }
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (gender && gender !== 'all') query.gender = gender;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ products, page: Number(page), pages: Math.ceil(total / Number(limit)), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product with Cloudinary/3:4 processing and variants
// @route   POST /api/products/admin
exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, price, salePrice, category, subcategory, gender, sizes, colors, variants, stock, tags, isFeatured } = req.body;

    // Process uploaded images with Cloudinary / Sharp (3:4 ratio - 900x1200)
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = await uploadAndProcessImage(file.buffer, file.originalname);
        uploadedImages.push(imageUrl);
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one product photo (Cover Photo #1)' });
    }

    // Parse variants if provided
    let parsedVariants = [];
    if (variants) {
      parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    // Calculate aggregate stock from variants if defined
    let calculatedStock = Number(stock) || 0;
    if (parsedVariants.length > 0) {
      calculatedStock = parsedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }

    // Parse sizes & colors
    const parsedSizes = sizes ? (typeof sizes === 'string' ? JSON.parse(sizes) : sizes) : [];
    const parsedColors = colors ? (typeof colors === 'string' ? JSON.parse(colors) : colors) : [];

    const product = await Product.create({
      title,
      description,
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : null,
      images: uploadedImages,
      category,
      subcategory: subcategory && subcategory !== 'null' && subcategory !== '' ? subcategory : null,
      gender: gender || 'women',
      sizes: parsedSizes,
      colors: parsedColors,
      variants: parsedVariants,
      stock: calculatedStock,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      isFeatured: isFeatured === 'true' || isFeatured === true
    });

    const populated = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update product with Cloudinary/3:4 processing and variants
// @route   PUT /api/products/admin/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { title, description, price, salePrice, category, subcategory, gender, sizes, colors, variants, stock, tags, isFeatured, isActive, existingImages } = req.body;

    if (title) product.title = title;
    if (description !== undefined) product.description = description;
    if (price) product.price = Number(price);
    if (salePrice !== undefined) product.salePrice = salePrice ? Number(salePrice) : null;
    if (category) product.category = category;
    if (subcategory !== undefined) {
      product.subcategory = subcategory && subcategory !== 'null' && subcategory !== '' ? subcategory : null;
    }
    if (gender) product.gender = gender;
    if (sizes) product.sizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    if (colors) product.colors = typeof colors === 'string' ? JSON.parse(colors) : colors;

    if (variants !== undefined) {
      const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      product.variants = parsedVariants;
      if (parsedVariants.length > 0) {
        product.stock = parsedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      } else if (stock !== undefined) {
        product.stock = Number(stock);
      }
    } else if (stock !== undefined) {
      product.stock = Number(stock);
    }

    if (tags) product.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;

    // Process new images through Cloudinary / Sharp 3:4
    let keepImages = existingImages ? (typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages) : product.images;
    if (!Array.isArray(keepImages)) keepImages = [];

    const newImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = await uploadAndProcessImage(file.buffer, file.originalname);
        newImageUrls.push(imageUrl);
      }
    }
    const finalImages = [...keepImages, ...newImageUrls];
    if (finalImages.length === 0) {
      return res.status(400).json({ message: 'A product must have at least one photo remaining' });
    }
    product.images = finalImages;

    await product.save();
    const populated = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Quick adjust stock (admin)
// @route   PATCH /api/products/admin/:id/stock
exports.updateStock = async (req, res, next) => {
  try {
    const { stock, delta } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (delta !== undefined) {
      product.stock = Math.max(0, (product.stock || 0) + Number(delta));
    } else if (stock !== undefined) {
      product.stock = Math.max(0, Number(stock));
    }

    // Sync variant stock if variants exist
    if (product.variants && product.variants.length > 0) {
      if (product.stock === 0) {
        product.variants.forEach((v) => { v.stock = 0; });
      } else if (delta !== undefined && delta > 0) {
        const addPerVariant = Math.floor(delta / product.variants.length);
        const remainder = delta % product.variants.length;
        product.variants.forEach((v, idx) => {
          v.stock = (v.stock || 0) + addPerVariant + (idx < remainder ? 1 : 0);
        });
      }
    }

    await product.save();
    res.json({ stock: product.stock, message: 'Stock updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (admin)
// @route   DELETE /api/products/admin/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};
