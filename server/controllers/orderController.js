const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Place order (guest or logged-in)
// @route   POST /api/orders
exports.placeOrder = async (req, res, next) => {
  try {
    const { items, customer, shippingCharge = 0 } = req.body;

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

    // Build order items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.title || item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}. Available: ${product.stock}` });
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

      // Decrease stock
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

    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;

    // If cancelled, restore stock
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
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
