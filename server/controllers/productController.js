const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadAndProcessImage } = require('../config/cloudinary');
const { getHiddenDepartments } = require('../utils/settingsHelper');

// @desc    Get all products (public)
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const { category, subcategory, gender, search, sort, minPrice, maxPrice, inStock, color, size, page = 1, limit = 12, tag } = req.query;
    const query = { isActive: true };

    // Gender filter (women, men, unisex, kids)
    if (gender && gender !== 'all') {
      const qGender = gender.toLowerCase();
      if (hiddenDepartments.includes(qGender)) {
        return res.json({ products: [], page: 1, pages: 0, total: 0 });
      }
      query.gender = { $in: [qGender, 'unisex'] };
    } else if (hiddenDepartments.length > 0) {
      query.gender = { $nin: hiddenDepartments };
    }

    // Category filter
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        if (cat.gender && hiddenDepartments.includes(cat.gender.toLowerCase())) {
          return res.json({ products: [], page: 1, pages: 0, total: 0 });
        }
        query.category = cat._id;
      }
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
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const escaped = cleanSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { title: regex },
        { tags: regex },
        { colors: regex },
        { description: regex }
      ];
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
    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate('category', 'name slug gender')
        .populate('subcategory', 'name slug')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean()
    ]);

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

// @desc    Get live search suggestions with images (Amazon / Flipkart style)
// @route   GET /api/products/search/suggestions
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const q = (req.query.q || '').trim();

    // Default popular suggestions excluding any hidden department
    const defaultSuggestions = [
      { text: 'Pure Silk Sarees', gender: 'women' },
      { text: 'Bridal Lehengas', gender: 'women' },
      { text: 'Designer Kurtis', gender: 'women' },
      { text: 'Men Formal Shirts', gender: 'men' },
      { text: 'Kids Festive Wear', gender: 'kids' }
    ]
      .filter((s) => !hiddenDepartments.includes(s.gender))
      .map((s) => s.text);

    if (!q) {
      // Return popular trending dresses when search is focused but empty
      const trendingQuery = { isActive: true, stock: { $gt: 0 } };
      if (hiddenDepartments.length > 0) {
        trendingQuery.gender = { $nin: hiddenDepartments };
      }

      const trending = await Product.find(trendingQuery)
        .populate('category', 'name slug gender')
        .populate('subcategory', 'name slug')
        .sort({ views: -1, createdAt: -1 })
        .limit(6)
        .select('title slug price salePrice images category subcategory gender stock tags')
        .lean();

      return res.json({
        products: trending,
        categories: [],
        suggestions: defaultSuggestions,
        query: ''
      });
    }

    const escaped = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const productQuery = {
      isActive: true,
      $or: [
        { title: regex },
        { tags: regex },
        { colors: regex },
        { description: regex }
      ]
    };
    if (hiddenDepartments.length > 0) {
      productQuery.gender = { $nin: hiddenDepartments };
    }

    const categoryQuery = {
      isActive: true,
      name: regex
    };
    if (hiddenDepartments.length > 0) {
      categoryQuery.gender = { $nin: hiddenDepartments };
    }

    const [products, categories, totalCount] = await Promise.all([
      Product.find(productQuery)
        .populate('category', 'name slug gender')
        .populate('subcategory', 'name slug')
        .sort({ stock: -1, views: -1, createdAt: -1 })
        .limit(6)
        .select('title slug price salePrice images category subcategory gender stock tags')
        .lean(),

      Category.find(categoryQuery)
        .limit(4)
        .select('name slug gender parent')
        .lean(),

      Product.countDocuments(productQuery)
    ]);

    // Extract relevant matching tags/keywords
    const suggestionsSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t && t.toLowerCase().includes(q.toLowerCase())) {
            suggestionsSet.add(t);
          }
        });
      }
    });

    res.json({
      products,
      categories,
      total: totalCount,
      suggestions: Array.from(suggestionsSet).slice(0, 4),
      query: q
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/:slug
exports.getProduct = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug gender')
      .populate('subcategory', 'name slug');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If product belongs to a hidden department, deny public access with 404
    if (product.gender && hiddenDepartments.includes(product.gender.toLowerCase())) {
      return res.status(404).json({ message: 'This collection/section is currently unavailable' });
    }

    // Increment views asynchronously without blocking response
    Product.updateOne({ _id: product._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated homepage bundle in a single high-speed database call
// @route   GET /api/products/homepage-bundle
exports.getHomepageBundle = async (req, res, next) => {
  try {
    const Settings = require('../models/Settings');
    const Banner = require('../models/Banner');

    const [categories, featured, newArrivals, settingsRaw, banners] = await Promise.all([
      // 1. Categories
      Category.find({ isActive: true })
        .populate('parent', 'name slug gender')
        .sort({ priority: 1, createdAt: -1 })
        .lean(),

      // 2. Featured / Trending Products
      Product.find({ isActive: true, isFeatured: true })
        .populate('category', 'name slug gender')
        .populate('subcategory', 'name slug')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),

      // 3. New Arrivals Products
      Product.find({ isActive: true })
        .populate('category', 'name slug gender')
        .populate('subcategory', 'name slug')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),

      // 4. Settings
      Settings.find().lean(),

      // 5. Active Banners
      Banner.find({ isActive: true })
        .sort({ priority: 1 })
        .lean()
    ]);

    const settings = {};
    if (Array.isArray(settingsRaw)) {
      settingsRaw.forEach((s) => {
        if (s && s.key) settings[s.key] = s.value;
      });
    }

    const hiddenDepartments = Array.isArray(settings.hiddenDepartments)
      ? settings.hiddenDepartments.map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : '')).filter(Boolean)
      : [];

    const filteredCategories = (categories || []).filter(
      (c) => !c.gender || !hiddenDepartments.includes(c.gender.toLowerCase())
    );
    const filteredFeatured = (featured || []).filter(
      (p) => !p.gender || !hiddenDepartments.includes(p.gender.toLowerCase())
    );
    const filteredNewArrivals = (newArrivals || []).filter(
      (p) => !p.gender || !hiddenDepartments.includes(p.gender.toLowerCase())
    );

    res.json({
      categories: filteredCategories,
      featured: filteredFeatured,
      newArrivals: filteredNewArrivals,
      settings: settings || {},
      banners: banners || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured/list
exports.getFeatured = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const filter = { isActive: true, isFeatured: true };
    if (hiddenDepartments.length > 0) {
      filter.gender = { $nin: hiddenDepartments };
    }

    const products = await Product.find(filter)
      .populate('category', 'name slug gender')
      .populate('subcategory', 'name slug')
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Get related products
// @route   GET /api/products/:slug/related
exports.getRelated = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.gender && hiddenDepartments.includes(product.gender.toLowerCase())) {
      return res.json([]);
    }

    const relFilter = {
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    };
    if (hiddenDepartments.length > 0) {
      relFilter.gender = { $nin: hiddenDepartments };
    }

    const related = await Product.find(relFilter)
      .populate('category', 'name slug gender')
      .populate('subcategory', 'name slug')
      .limit(4)
      .lean();

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

const resolveImageRef = (ref, images) => {
  if (!ref || typeof ref !== 'string') return '';
  const match = ref.match(/^__photo_(\d+)__$/);
  if (match) {
    const idx = parseInt(match[1], 10);
    return images[idx] || '';
  }
  return ref;
};

// @desc    Create product with Cloudinary/3:4 processing and variants
// @route   POST /api/products/admin
exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, price, salePrice, category, subcategory, gender, sizes, colors, variants, colorImages, stock, tags, isFeatured } = req.body;

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
    if (Array.isArray(parsedVariants)) {
      parsedVariants = parsedVariants.map(v => ({
        ...v,
        image: resolveImageRef(v.image, uploadedImages)
      }));
    }

    // Parse colorImages if provided
    let parsedColorImages = [];
    if (colorImages) {
      parsedColorImages = typeof colorImages === 'string' ? JSON.parse(colorImages) : colorImages;
    }
    if (Array.isArray(parsedColorImages)) {
      parsedColorImages = parsedColorImages.map(ci => ({
        color: ci.color ? String(ci.color).trim() : '',
        image: resolveImageRef(ci.image, uploadedImages)
      }));
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
      colorImages: parsedColorImages,
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

    const prevStock = product.stock || 0;
    const { title, description, price, salePrice, category, subcategory, gender, sizes, colors, variants, colorImages, stock, tags, isFeatured, isActive, existingImages } = req.body;

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

    // Process images first so finalImages is available to resolve slot references
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

    if (colorImages !== undefined) {
      let parsedColorImages = typeof colorImages === 'string' ? JSON.parse(colorImages) : colorImages;
      if (Array.isArray(parsedColorImages)) {
        product.colorImages = parsedColorImages.map(ci => ({
          color: ci.color ? String(ci.color).trim() : '',
          image: resolveImageRef(ci.image, finalImages)
        }));
      }
    }

    if (variants !== undefined) {
      let parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      if (Array.isArray(parsedVariants)) {
        product.variants = parsedVariants.map(v => ({
          ...v,
          image: resolveImageRef(v.image, finalImages)
        }));
        if (parsedVariants.length > 0) {
          product.stock = parsedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        } else if (stock !== undefined) {
          product.stock = Number(stock);
        }
      }
    } else if (stock !== undefined) {
      product.stock = Number(stock);
    }

    if (tags) product.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;

    await product.save();

    // If restocked from 0, automatically alert waitlisted customers!
    if (prevStock <= 0 && product.stock > 0) {
      const { notifyWaitlistedCustomers } = require('./notificationController');
      notifyWaitlistedCustomers(product._id).catch(err => {
        console.error('Error notifying waitlisted customers in updateProduct:', err.message);
      });
    }

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

    const prevStock = product.stock || 0;

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

    // If restocked from 0, automatically alert waitlisted customers!
    if (prevStock <= 0 && product.stock > 0) {
      const { notifyWaitlistedCustomers } = require('./notificationController');
      notifyWaitlistedCustomers(product._id).catch(err => {
        console.error('Error notifying waitlisted customers in updateStock:', err.message);
      });
    }

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
