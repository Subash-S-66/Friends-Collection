const Product = require('../models/Product');
const User = require('../models/User');

/**
 * Checks live database stock for each cart item and enriches it
 */
const enrichItemsWithLiveStock = async (items) => {
  if (!Array.isArray(items)) return [];

  const enriched = [];
  for (const item of items) {
    const prodId = item.product?._id || item.product;
    if (!prodId) continue;

    try {
      const prod = await Product.findById(prodId).lean();
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

      // Check variant specific stock if size or color specified
      let currentStock = prod.stock !== undefined && prod.stock !== null ? prod.stock : 0;
      if (prod.variants && prod.variants.length > 0) {
        const match = prod.variants.find(
          (v) =>
            (!item.size || !v.size || v.size.trim().toLowerCase() === (item.size || '').trim().toLowerCase()) &&
            (!item.color || !v.color || v.color.trim().toLowerCase() === (item.color || '').trim().toLowerCase())
        );
        currentStock = match ? match.stock : 0;
      }

      const isOutOfStock = currentStock <= 0;

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
        image: prod.images?.[0] || item.image || '',
        slug: prod.slug || item.slug || '',
        stock: currentStock,
        isOutOfStock
      });
    } catch {
      enriched.push({
        ...item,
        product: prodId,
        stock: 0,
        isOutOfStock: true
      });
    }
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

    const existingMap = new Map();
    (user.cart || []).forEach((item) => {
      const key = `${item.product.toString()}_${item.size || ''}_${item.color || ''}`;
      existingMap.set(key, item);
    });

    // Merge incoming guest items
    for (const item of incomingItems) {
      const prodId = (item.product?._id || item.product || '').toString();
      if (!prodId) continue;
      const key = `${prodId}_${item.size || ''}_${item.color || ''}`;

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
