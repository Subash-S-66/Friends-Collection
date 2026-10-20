const Product = require('../models/Product');
const User = require('../models/User');

/**
 * Checks live database stock for each cart item and enriches it
 */
/**
 * Checks live database stock for each cart item in a SINGLE batch query and enriches it
 */
const enrichItemsWithLiveStock = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const norm = (s) => (s || '').toString().trim().toLowerCase();

  // Extract unique valid product ObjectIds
  const prodIds = Array.from(
    new Set(
      items
        .map((i) => (i.product?._id || i.product || '').toString())
        .filter((id) => id && id.length === 24)
    )
  );

  let productMap = new Map();
  if (prodIds.length > 0) {
    try {
      const prods = await Product.find({ _id: { $in: prodIds } }).lean();
      prods.forEach((p) => {
        productMap.set(p._id.toString(), p);
      });
    } catch (err) {
      console.warn('Error batch fetching products for cart:', err.message);
    }
  }

  const enriched = [];
  for (const item of items) {
    const prodId = (item.product?._id || item.product || '').toString();
    if (!prodId) continue;

    const prod = productMap.get(prodId);
    if (!prod) {
      enriched.push({
        ...item,
        product: prodId,
        stock: 0,
        isOutOfStock: true,
        productUnavailable: true
      });
      continue;
    }

    const targetSize = norm(item.size);
    const targetColor = norm(item.color);

    // Check variant specific stock if size or color specified
    let currentStock = prod.stock !== undefined && prod.stock !== null ? Number(prod.stock) : 0;
    let match = null;
    if (prod.variants && prod.variants.length > 0) {
      // 1. Try matching both size and color
      match = prod.variants.find((v) => {
        const vSize = norm(v.size);
        const vColor = norm(v.color);
        return (
          (!targetSize || !vSize || vSize === targetSize || targetSize.startsWith(vSize)) &&
          (!targetColor || !vColor || vColor === targetColor)
        );
      });

      // 2. If no exact match, try size match only
      if (!match && targetSize) {
        match = prod.variants.find((v) => {
          const vSize = norm(v.size);
          return vSize && (vSize === targetSize || targetSize.startsWith(vSize));
        });
      }

      // 3. If no size match, try color match only
      if (!match && targetColor) {
        match = prod.variants.find((v) => norm(v.color) === targetColor);
      }

      if (match) {
        currentStock = Number(match.stock) || 0;
      }
    }

    const isOutOfStock = currentStock <= 0;

    // Resolve variant or color specific image
    let resolvedImage = '';
    if (match && match.image) {
      resolvedImage = match.image;
    } else if (targetColor && prod.colorImages && prod.colorImages.length > 0) {
      const colorMatch = prod.colorImages.find((ci) => norm(ci.color) === targetColor);
      if (colorMatch && colorMatch.image) {
        resolvedImage = colorMatch.image;
      }
    }
    if (!resolvedImage) {
      resolvedImage = item.image || prod.images?.[0] || '';
    }

    enriched.push({
      product: prod._id,
      title: prod.title || item.title || '',
      price: prod.salePrice || prod.price || item.price || 0,
      originalPrice: prod.price || item.originalPrice || 0,
      size: item.size || '',
      color: item.color || '',
      quantity: isOutOfStock
        ? (item.quantity || 1)
        : Math.min(item.quantity || 1, Math.max(1, currentStock)),
      image: resolvedImage,
      slug: prod.slug || item.slug || '',
      stock: currentStock,
      isOutOfStock
    });
  }

  return enriched;
};

// @desc    Get user's synced cloud cart with live stock check
// @route   GET /api/cart
exports.getCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const enriched = await enrichItemsWithLiveStock(user.cart || []);
    // Update user cart with validated live values
    user.cart = enriched.map((i) => ({
      product: i.product,
      title: i.title,
      price: i.price,
      originalPrice: i.originalPrice,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      image: i.image,
      slug: i.slug,
      stock: i.stock
    }));
    await user.save().catch(() => {});

    res.json({
      items: enriched,
      availableItems: enriched.filter((i) => !i.isOutOfStock),
      outOfStockCount: enriched.filter((i) => i.isOutOfStock).length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Merge guest cart with user cloud cart across devices
// @route   POST /api/cart/sync
exports.syncCart = async (req, res, next) => {
  try {
    const { items: incomingItems = [] } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const existingMap = new Map();

    (user.cart || []).forEach((item) => {
      const prodId = (item.product?._id || item.product || '').toString();
      if (!prodId) return;
      const key = `${prodId}__${norm(item.size)}__${norm(item.color)}`;
      existingMap.set(key, item);
    });

    // Merge incoming guest items
    for (const item of incomingItems) {
      const prodId = (item.product?._id || item.product || '').toString();
      if (!prodId) continue;
      const key = `${prodId}__${norm(item.size)}__${norm(item.color)}`;

      if (existingMap.has(key)) {
        const existing = existingMap.get(key);
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
      } else {
        existingMap.set(key, {
          product: prodId,
          title: item.title,
          price: item.price,
          originalPrice: item.originalPrice,
          size: item.size || '',
          color: item.color || '',
          quantity: item.quantity || 1,
          image: item.image,
          slug: item.slug
        });
      }
    }

    const mergedList = Array.from(existingMap.values());
    const enriched = await enrichItemsWithLiveStock(mergedList);

    user.cart = enriched.map((i) => ({
      product: i.product,
      title: i.title,
      price: i.price,
      originalPrice: i.originalPrice,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      image: i.image,
      slug: i.slug,
      stock: i.stock
    }));
    await user.save().catch(() => {});

    res.json({
      items: enriched,
      availableItems: enriched.filter((i) => !i.isOutOfStock),
      outOfStockCount: enriched.filter((i) => i.isOutOfStock).length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user's cart in cloud
// @route   PUT /api/cart
exports.updateCart = async (req, res, next) => {
  try {
    const { items = [] } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const enriched = await enrichItemsWithLiveStock(items);

    user.cart = enriched.map((i) => ({
      product: i.product,
      title: i.title,
      price: i.price,
      originalPrice: i.originalPrice,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      image: i.image,
      slug: i.slug,
      stock: i.stock
    }));
    await user.save().catch(() => {});

    res.json({
      items: enriched,
      availableItems: enriched.filter((i) => !i.isOutOfStock),
      outOfStockCount: enriched.filter((i) => i.isOutOfStock).length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear user cloud cart
// @route   DELETE /api/cart
exports.clearCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.cart = [];
      await user.save().catch(() => {});
    }
    res.json({ items: [], availableItems: [], outOfStockCount: 0 });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate live database stock for cart items (public for guests and users)
// @route   POST /api/cart/validate
exports.validateCart = async (req, res, next) => {
  try {
    const { items = [] } = req.body;
    const enriched = await enrichItemsWithLiveStock(items);

    res.json({
      items: enriched,
      availableItems: enriched.filter((i) => !i.isOutOfStock),
      outOfStockCount: enriched.filter((i) => i.isOutOfStock).length
    });
  } catch (error) {
    next(error);
  }
};

exports.enrichItemsWithLiveStock = enrichItemsWithLiveStock;

