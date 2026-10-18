const Order = require('../models/Order');
const Product = require('../models/Product');
const StockReservation = require('../models/StockReservation');

// Helper to get effective available stock excluding the requesting session's own reservation
async function getEffectiveAvailableStock(productId, size = '', color = '', excludeSessionId = null) {
  const product = await Product.findById(productId);
  if (!product) return 0;

  let baseStock = Number(product.stock) || 0;
  if (product.variants && product.variants.length > 0) {
    const v = product.variants.find(
      (v) => (!size || v.size === size) && (!color || v.color === color)
    );
    if (v) baseStock = Number(v.stock) || 0;
  }

  // Active holds: active and expiresAt > now, excluding excludeSessionId
  const now = new Date();
  const filter = {
    status: 'active',
    expiresAt: { $gt: now },
    'items.product': productId
  };
  if (excludeSessionId) {
    filter.sessionId = { $ne: excludeSessionId };
  }

  const activeReservations = await StockReservation.find(filter);
  let heldQty = 0;
  for (const res of activeReservations) {
    for (const it of res.items) {
      if (it.product.toString() === productId.toString()) {
        if ((!size || it.size === size) && (!color || it.color === color)) {
          heldQty += Number(it.quantity) || 1;
        }
      }
    }
  }

  return Math.max(0, baseStock - heldQty);
}

// @desc    Reserve stock for 10 minutes when proceeding to checkout
// @route   POST /api/orders/reserve
exports.reserveCheckoutStock = async (req, res, next) => {
  try {
    const { sessionId, items } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required for checkout reservation' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for reservation' });
    }

    // Verify stock availability for all items
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.title || item.product}` });
      }

      const available = await getEffectiveAvailableStock(item.product, item.size, item.color, sessionId);
      if (available < item.quantity) {
        return res.status(409).json({
          message: `Cannot reserve "${product.title}" (${item.size || 'Standard'}). Another customer is currently holding this item in checkout. If they do not purchase within 10 minutes, it will be released!`,
          item: item.title,
          available
        });
      }
    }

    // 10 minutes reservation window
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const expiresAt = new Date(Date.now() + TEN_MINUTES_MS);

    // Update existing active reservation for this session, or create new one
    let reservation = await StockReservation.findOne({ sessionId, status: 'active' });
    if (reservation) {
      reservation.items = items.map((it) => ({
        product: it.product,
        size: it.size || '',
        color: it.color || '',
        quantity: Number(it.quantity) || 1
      }));
      reservation.expiresAt = expiresAt;
      reservation.user = req.user ? req.user._id : null;
      await reservation.save();
    } else {
      reservation = await StockReservation.create({
        sessionId,
        user: req.user ? req.user._id : null,
        items: items.map((it) => ({
          product: it.product,
          size: it.size || '',
          color: it.color || '',
          quantity: Number(it.quantity) || 1
        })),
        status: 'active',
        expiresAt
      });
    }

    res.json({
      success: true,
      reservationId: reservation._id,
      expiresAt: reservation.expiresAt,
      holdMinutes: 10,
      remainingSeconds: Math.round((reservation.expiresAt - Date.now()) / 1000)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Release stock hold when user abandons or leaves checkout
// @route   POST /api/orders/release-hold
exports.releaseCheckoutStock = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await StockReservation.updateMany(
        { sessionId, status: 'active' },
        { status: 'released' }
      );
    }
    res.json({ success: true, message: 'Stock hold released' });
  } catch (error) {
    next(error);
  }
};

// @desc    Check reservation status and remaining seconds
// @route   GET /api/orders/reservation/:sessionId
exports.getReservationStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const reservation = await StockReservation.findOne({ sessionId, status: 'active' });
    if (!reservation) {
      return res.json({ active: false, remainingSeconds: 0 });
    }

    const remainingSeconds = Math.max(0, Math.round((reservation.expiresAt - Date.now()) / 1000));
    if (remainingSeconds <= 0) {
      reservation.status = 'expired';
      await reservation.save();
      return res.json({ active: false, remainingSeconds: 0 });
    }

    res.json({
      active: true,
      expiresAt: reservation.expiresAt,
      remainingSeconds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Place order (guest or logged-in)
// @route   POST /api/orders
exports.placeOrder = async (req, res, next) => {
  try {
    const { items, customer, shippingCharge = 0, sessionId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }
    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({ message: 'Customer name and phone number are required' });
    }
    if (!customer.address || !customer.address.street || !customer.address.city || !customer.address.state || !customer.address.pincode) {
      return res.status(400).json({ message: 'Complete address is required' });
    }

    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(customer.phone.replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit Indian phone number' });
    }

    if (customer.secondaryPhone && customer.secondaryPhone.trim()) {
      const cleanSecPhone = customer.secondaryPhone.replace(/\s/g, '');
      if (!phoneRegex.test(cleanSecPhone)) {
        return res.status(400).json({ message: 'Secondary phone number must be a valid 10-digit Indian phone number' });
      }
      customer.secondaryPhone = cleanSecPhone;
    } else {
      customer.secondaryPhone = '';
    }

    // Build order items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.title || item.product}` });
      }

      // Check effective available stock excluding this session's hold
      const available = await getEffectiveAvailableStock(item.product, item.size, item.color, sessionId);
      if (available < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.title}. Available: ${available}. Another shopper may have recently purchased or reserved this item.`
        });
      }

      const price = product.salePrice || product.price;
      totalAmount += price * item.quantity;

      orderItems.push({
        product: product._id,
        title: product.title,
        price,
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
        image: product.images[0] || ''
      });

      // Decrease stock by item.quantity (e.g. -1 for 1 item, -2 for 2 items)
      product.stock = Math.max(0, product.stock - item.quantity);
      if (product.variants && product.variants.length > 0) {
        const vIndex = product.variants.findIndex(
          (v) => (!item.size || v.size === item.size) && (!item.color || v.color === item.color)
        );
        if (vIndex >= 0) {
          product.variants[vIndex].stock = Math.max(0, product.variants[vIndex].stock - item.quantity);
        }
      }
      await product.save();
    }

    const order = await Order.create({
      items: orderItems,
      customer,
      user: req.user ? req.user._id : null,
      totalAmount,
      shippingCharge: Number(shippingCharge)
    });

    // Auto-save address to user profile if user is logged in and opted to save
    if (req.user && req.body.saveAddress) {
      try {
        const User = require('../models/User');
        const user = await User.findById(req.user._id);
        if (user) {
          if (!user.phone && customer.phone) user.phone = customer.phone;
          if (customer.secondaryPhone) user.secondaryPhone = customer.secondaryPhone;

          const cleanStreet = customer.address.street.trim();
          const cleanPincode = customer.address.pincode.trim();
          const cleanCity = customer.address.city.trim();
          const cleanState = customer.address.state.trim();

          const existingIdx = user.savedAddresses.findIndex(
            (a) => a.street?.toLowerCase() === cleanStreet.toLowerCase() && a.pincode === cleanPincode
          );

          if (existingIdx >= 0) {
            user.savedAddresses[existingIdx].city = cleanCity;
            user.savedAddresses[existingIdx].state = cleanState;
            user.savedAddresses[existingIdx].phone = customer.phone;
            user.savedAddresses[existingIdx].secondaryPhone = customer.secondaryPhone || '';
            user.savedAddresses[existingIdx].isDefault = true;
            user.savedAddresses.forEach((a, i) => {
              if (i !== existingIdx) a.isDefault = false;
            });
          } else {
            user.savedAddresses.forEach((a) => {
              a.isDefault = false;
            });
            user.savedAddresses.unshift({
              label: 'Delivery Address',
              street: cleanStreet,
              city: cleanCity,
              state: cleanState,
              pincode: cleanPincode,
              phone: customer.phone,
              secondaryPhone: customer.secondaryPhone || '',
              isDefault: true
            });
          }
          await user.save();
        }
      } catch (saveErr) {
        console.error('Failed to auto-save address to user profile:', saveErr);
      }
    }

    // Mark any active reservation for this session as completed (hold is cleared)
    if (sessionId) {
      await StockReservation.updateMany(
        { sessionId, status: 'active' },
        { status: 'completed' }
      );
    }

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user orders
// @route   GET /api/orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Track order by orderId and phone
// @route   GET /api/orders/track/:orderId
exports.trackOrder = async (req, res, next) => {
  try {
    const { phone } = req.query;
    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (phone && order.customer.phone !== phone.replace(/\s/g, '')) {
      return res.status(403).json({ message: 'Phone number does not match the order' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// === ADMIN ===

// @desc    Get all orders (admin)
// @route   GET /api/orders/admin/all
exports.adminGetOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search, startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ orders, page: Number(page), pages: Math.ceil(total / Number(limit)), total });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details (admin)
// @route   GET /api/orders/admin/:id
exports.adminGetOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/orders/admin/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;
    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;

    // If cancelled, restore stock for base product and variants
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
        if (prod) {
          prod.stock = (prod.stock || 0) + item.quantity;
          if (prod.variants && prod.variants.length > 0) {
            const vIndex = prod.variants.findIndex(
              (v) => (!item.size || v.size === item.size) && (!item.color || v.color === item.color)
            );
            if (vIndex >= 0) {
              prod.variants[vIndex].stock = (prod.variants[vIndex].stock || 0) + item.quantity;
            }
          }
          await prod.save();
        }
      }
    }

    await order.save();
    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order stats (admin dashboard)
// @route   GET /api/orders/admin/stats
exports.getOrderStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [todayOrders, weekOrders, monthOrders, totalOrders, revenueResult, pendingOrders, statusCounts] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: weekAgo } }),
      Order.countDocuments({ createdAt: { $gte: monthAgo } }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });

    res.json({
      todayOrders,
      weekOrders,
      monthOrders,
      totalOrders,
      totalRevenue,
      pendingOrders,
      statusBreakdown: statusMap
    });
  } catch (error) {
    next(error);
  }
};
