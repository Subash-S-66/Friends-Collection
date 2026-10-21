const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const StockReservation = require('../models/StockReservation');
const User = require('../models/User');
const { deductOrderStockAtomically, rollbackStockDeduction, norm } = require('../utils/inventoryManager');

function getCourierTrackingUrl(courier, trackingNumber) {
  if (!trackingNumber) return '';
  const num = encodeURIComponent(trackingNumber.trim());
  const c = (courier || '').toLowerCase();
  if (c.includes('delhivery')) return `https://www.delhivery.com/track/package/${num}`;
  if (c.includes('dtdc')) return `https://www.dtdc.in/tracking/shipment-tracking.asp?trCode=${num}`;
  if (c.includes('blue dart') || c.includes('bluedart')) return `https://www.bluedart.com/tracking?trackFor=0&trackNo=${num}`;
  if (c.includes('speed post') || c.includes('india post')) return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  if (c.includes('professional')) return `https://www.tpcindia.com/track.aspx`;
  if (c.includes('st courier')) return `https://stcourier.com/track/shipment/${num}`;
  return '';
}

// Helper to get live database available stock for product or variant
async function getEffectiveAvailableStock(productId, size = '', color = '') {
  const product = await Product.findById(productId);
  if (!product) return 0;

  const targetSize = norm(size);
  const targetColor = norm(color);

  let baseStock = Number(product.stock) || 0;
  if (product.variants && product.variants.length > 0) {
    const v = product.variants.find(
      (v) =>
        (!targetSize || !v.size || norm(v.size) === targetSize || targetSize.startsWith(norm(v.size))) &&
        (!targetColor || !v.color || norm(v.color) === targetColor)
    );
    if (v) baseStock = Number(v.stock) || 0;
  }

  return Math.max(0, baseStock);
}

// @desc    Reserve stock endpoint (graceful no-op to prevent locking other shoppers)
// @route   POST /api/orders/reserve
exports.reserveCheckoutStock = async (req, res, next) => {
  try {
    res.json({
      success: true,
      holdMinutes: 10,
      remainingSeconds: 600
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Release stock hold
// @route   POST /api/orders/release-hold
exports.releaseCheckoutStock = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      await StockReservation.deleteMany({ sessionId }).catch(() => {});
    }
    res.json({ success: true, message: 'Stock hold released' });
  } catch (error) {
    next(error);
  }
};

// @desc    Check reservation status
// @route   GET /api/orders/reservation/:sessionId
exports.getReservationStatus = async (req, res, next) => {
  try {
    res.json({
      active: true,
      remainingSeconds: 600
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Place order (guest or logged-in)
// @route   POST /api/orders
exports.placeOrder = async (req, res, next) => {
  let deductionResult = null;
  try {
    const { items, customer, shippingCharge = 0, sessionId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }
    if (!customer || !customer.name || !customer.phone || !customer.email) {
      return res.status(400).json({ message: 'Customer name, mobile number, and email address are required' });
    }
    if (!customer.address || !customer.address.street || !customer.address.city || !customer.address.state || !customer.address.pincode) {
      return res.status(400).json({ message: 'Complete delivery address is required' });
    }

    // Validate primary phone number format (strictly 10-digit Indian mobile)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = (customer.phone || '').toString().replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit Indian mobile number' });
    }
    customer.phone = cleanPhone;

    // Validate email address format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanEmail = (customer.email || '').toString().trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address for order confirmation & tax invoice' });
    }
    customer.email = cleanEmail;

    if (customer.secondaryPhone && customer.secondaryPhone.trim()) {
      const cleanSecPhone = customer.secondaryPhone.toString().replace(/\D/g, '');
      if (!phoneRegex.test(cleanSecPhone)) {
        return res.status(400).json({ message: 'Secondary phone number must be a valid 10-digit Indian mobile number' });
      }
      if (cleanSecPhone === cleanPhone) {
        return res.status(400).json({ message: 'Alternate phone number must be different from primary phone number' });
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

      // Check if Cash on Delivery is supported by this product
      const requestedPaymentMethod = (req.body.paymentMethod || 'cod').toLowerCase();
      if (requestedPaymentMethod === 'cod' && product.acceptCashOnDelivery === false) {
        return res.status(400).json({
          message: `Cash on Delivery is not available for "${product.title}". Please choose an online payment method or remove this item.`
        });
      }

      // Check live database stock
      const available = await getEffectiveAvailableStock(item.product, item.size, item.color);
      if (available < item.quantity) {
        return res.status(400).json({
          message: `"${product.title}" ${item.size ? `(${item.size})` : ''} is out of stock. Please check your shopping bag.`,
          isOutOfStock: true,
          available
        });
      }

      const price = product.salePrice || product.price;
      totalAmount += price * item.quantity;

      // Resolve variant or color specific image
      const targetSize = norm(item.size);
      const targetColor = norm(item.color);
      let resolvedItemImage = '';
      if (product.variants && product.variants.length > 0) {
        let match = product.variants.find(v => {
          const vSize = norm(v.size);
          const vColor = norm(v.color);
          return (
            (!targetSize || !vSize || vSize === targetSize || targetSize.startsWith(vSize)) &&
            (!targetColor || !vColor || vColor === targetColor)
          );
        });
        if (!match && targetSize) {
          match = product.variants.find(v => {
            const vSize = norm(v.size);
            return vSize && (vSize === targetSize || targetSize.startsWith(vSize));
          });
        }
        if (!match && targetColor) {
          match = product.variants.find(v => norm(v.color) === targetColor);
        }
        if (match && match.image) {
          resolvedItemImage = match.image;
        }
      }
      if (!resolvedItemImage && targetColor && product.colorImages && product.colorImages.length > 0) {
        const colorMatch = product.colorImages.find(ci => norm(ci.color) === targetColor);
        if (colorMatch && colorMatch.image) {
          resolvedItemImage = colorMatch.image;
        }
      }
      if (!resolvedItemImage) {
        resolvedItemImage = item.image || (product.images && product.images[0]) || '';
      }

      orderItems.push({
        product: product._id,
        title: product.title,
        price,
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
        image: resolvedItemImage
      });
    }

    // Atomically deduct inventory with optimistic concurrency control (OCC).
    // Eliminates race conditions so 2 shoppers cannot purchase the final stock concurrently (Amazon & Flipkart style).
    deductionResult = await deductOrderStockAtomically(items);
    if (!deductionResult.success) {
      return res.status(409).json({
        message: deductionResult.error,
        isOutOfStock: true,
        failedItem: deductionResult.failedItem
      });
    }

    // Attempt to link to user account if logged in or by matching phone/email
    let orderUserId = req.user ? req.user._id : null;
    if (!orderUserId) {
      try {
        const cleanPhone = customer.phone ? customer.phone.replace(/\s/g, '').replace(/^\+91/, '') : '';
        const cleanEmail = customer.email ? customer.email.toLowerCase().trim() : '';
        if (cleanPhone || cleanEmail) {
          const matchUser = await User.findOne({
            $or: [
              ...(cleanPhone ? [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }] : []),
              ...(cleanEmail ? [{ email: cleanEmail }] : [])
            ]
          });
          if (matchUser) orderUserId = matchUser._id;
        }
      } catch (linkErr) {
        console.error('Error linking user on order create:', linkErr);
      }
    }

    let order;
    try {
      order = await Order.create({
        items: orderItems,
        customer,
        user: orderUserId,
        totalAmount,
        shippingCharge: Number(shippingCharge),
        status: 'order_received',
        paymentStatus: req.body.paymentStatus || 'payment_pending',
        paymentMethod: req.body.paymentMethod || 'cod',
        paymentNotes: req.body.paymentNotes || '',
        tracking: {
          statusHistory: [{
            status: 'order_received',
            message: 'Order placed & received at boutique. Awaiting admin confirmation.',
            location: 'Jamalia Boutique, Chennai',
            timestamp: new Date()
          }]
        }
      });
    } catch (createErr) {
      await rollbackStockDeduction(deductionResult.deductedItems).catch(() => {});
      throw createErr;
    }

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

          if (!Array.isArray(user.savedAddresses)) user.savedAddresses = [];
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

    // Immediately clear cart in database for the user so items never resurrect
    if (orderUserId) {
      await User.findByIdAndUpdate(orderUserId, { $set: { cart: [] } }).catch(() => {});
    }
    if (req.user?._id && req.user._id.toString() !== orderUserId?.toString()) {
      await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } }).catch(() => {});
    }

    // Mark any active reservation for this session as completed (hold is cleared)
    if (sessionId) {
      await StockReservation.updateMany(
        { sessionId, status: 'active' },
        { status: 'completed' }
      );
    }
    // Note: Order confirmation email will be dispatched once admin reviews & confirms the order in Admin Panel.
    res.status(201).json(order);
  } catch (error) {
    if (deductionResult?.success && deductionResult?.deductedItems) {
      await rollbackStockDeduction(deductionResult.deductedItems).catch(() => {});
    }
    next(error);
  }
};

// @desc    Get user orders (by user ID, phone, or email)
// @route   GET /api/orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const userPhone = req.user.phone ? req.user.phone.replace(/\s/g, '').replace(/^\+91/, '') : '';
    const userEmail = req.user.email ? req.user.email.toLowerCase().trim() : '';

    const query = {
      $or: [{ user: req.user._id }]
    };

    if (userPhone) {
      query.$or.push({ 'customer.phone': userPhone });
      query.$or.push({ 'customer.phone': `+91${userPhone}` });
      query.$or.push({ 'customer.phone': `+91 ${userPhone}` });
    }
    if (userEmail) {
      query.$or.push({ 'customer.email': userEmail });
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    // Auto-link any matching orders that were unlinked
    for (const o of orders) {
      if (!o.user) {
        o.user = req.user._id;
        await o.save().catch(() => {});
      }
    }

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Track order by orderId and optional phone
// @route   GET /api/orders/track/:orderId
exports.trackOrder = async (req, res, next) => {
  try {
    const { phone } = req.query;
    const cleanOrderId = (req.params.orderId || '').trim();

    const lookupQuery = {
      $or: [
        { orderId: { $regex: new RegExp(`^${cleanOrderId}$`, 'i') } }
      ]
    };

    if (mongoose.isValidObjectId(cleanOrderId)) {
      lookupQuery.$or.push({ _id: cleanOrderId });
    }

    const order = await Order.findOne(lookupQuery);

    if (!order) {
      return res.status(404).json({ message: 'Order not found. Please verify your Order ID.' });
    }

    if (phone) {
      const cleanInputPhone = phone.replace(/\s/g, '').replace(/^\+91/, '');
      const orderPhone = (order.customer?.phone || '').replace(/\s/g, '').replace(/^\+91/, '');
      const orderSecPhone = (order.customer?.secondaryPhone || '').replace(/\s/g, '').replace(/^\+91/, '');
      if (cleanInputPhone !== orderPhone && cleanInputPhone !== orderSecPhone) {
        return res.status(403).json({ message: 'Phone number does not match this order.' });
      }
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders by customer phone number (lookup for mobile users / guest orders)
// @route   GET /api/orders/by-phone/:phone
exports.getOrdersByPhone = async (req, res, next) => {
  try {
    const rawPhone = (req.params.phone || req.query.phone || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
    }

    const phoneRegex = new RegExp(`${cleanPhone}$`);
    const orders = await Order.find({
      $or: [
        { 'customer.phone': { $regex: phoneRegex } },
        { 'customer.secondaryPhone': { $regex: phoneRegex } }
      ]
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// === ADMIN ===

// @desc    Get all orders (admin)
// @route   GET /api/orders/admin/all
exports.adminGetOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20, search, startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'all') {
      if (status === 'pending' || status === 'yet_to_move' || status === 'order_received') {
        query.status = { $in: ['pending', 'yet_to_move', 'order_received'] };
      } else {
        query.status = status;
      }
    }

    if (paymentStatus && paymentStatus !== 'all') {
      if (paymentStatus === 'pending' || paymentStatus === 'payment_pending') {
        query.paymentStatus = { $in: ['pending', 'payment_pending'] };
      } else {
        query.paymentStatus = paymentStatus;
      }
    }

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

// @desc    Update order status & shipping tracking (admin)
// @route   PUT /api/orders/admin/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus, paymentNotes, notes, tracking } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;
    if (status) order.status = status;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid' && !order.paidAt) {
        order.paidAt = new Date();
      }
    }
    if (paymentNotes !== undefined) order.paymentNotes = paymentNotes;
    if (notes !== undefined) order.notes = notes;

    // Handle tracking info
    if (tracking) {
      if (!order.tracking) {
        order.tracking = { statusHistory: [] };
      }

      if (tracking.courier !== undefined) order.tracking.courier = tracking.courier.trim();
      if (tracking.trackingNumber !== undefined) order.tracking.trackingNumber = tracking.trackingNumber.trim();
      if (tracking.estimatedDelivery !== undefined) order.tracking.estimatedDelivery = tracking.estimatedDelivery.trim();
      if (tracking.notes !== undefined) order.tracking.notes = tracking.notes.trim();

      // Resolve tracking URL
      if (tracking.trackingUrl && tracking.trackingUrl.trim()) {
        order.tracking.trackingUrl = tracking.trackingUrl.trim();
      } else if (order.tracking.courier && order.tracking.trackingNumber) {
        const autoUrl = getCourierTrackingUrl(order.tracking.courier, order.tracking.trackingNumber);
        if (autoUrl) order.tracking.trackingUrl = autoUrl;
      }

      // Add to status history
      const historyMsg = tracking.message || (status !== prevStatus ? `Status updated to ${status}` : 'Tracking updated');
      if (!Array.isArray(order.tracking.statusHistory)) {
        order.tracking.statusHistory = [];
      }
      order.tracking.statusHistory.push({
        status: status || order.status,
        message: historyMsg,
        location: tracking.location || 'Jamalia Hub, Chennai',
        timestamp: new Date()
      });
    }

    // Auto-log status transition in statusHistory if tracking was not explicitly passed
    if (status && status !== prevStatus && !tracking) {
      if (!order.tracking) order.tracking = { statusHistory: [] };
      if (!Array.isArray(order.tracking.statusHistory)) order.tracking.statusHistory = [];
      const defaultMsgs = {
        order_received: 'Order placed & received at boutique.',
        confirmed: 'Order received & confirmed by admin. Garments packed with boutique care.',
        shipped: 'Order dispatched with courier partner.',
        delivered: 'Order delivered to doorstep.',
        cancelled: 'Order cancelled.'
      };
      order.tracking.statusHistory.push({
        status,
        message: defaultMsgs[status] || `Status updated to ${status}`,
        location: 'Jamalia Hub, Chennai',
        timestamp: new Date()
      });
    }

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

    // Once admin confirms order received (status === 'confirmed'), dispatch confirmation email to user
    if (status === 'confirmed' && prevStatus !== 'confirmed') {
      try {
        const { sendOrderConfirmationEmail } = require('../utils/emailService');
        sendOrderConfirmationEmail({ order }).catch((mailErr) =>
          console.error(`⚠️ Email dispatch failed when admin confirmed order #${order.orderId}:`, mailErr)
        );
      } catch (mailErr) {
        console.warn('Could not dispatch confirmation email:', mailErr);
      }
    }

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

    const [todayOrders, weekOrders, monthOrders, totalOrders, revenueResult, pendingOrders, statusCounts, paymentCounts] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: weekAgo } }),
      Order.countDocuments({ createdAt: { $gte: monthAgo } }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ status: { $in: ['pending', 'yet_to_move'] } }),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });
    const paymentMap = {};
    paymentCounts.forEach(p => { paymentMap[p._id || 'pending'] = p.count; });

    res.json({
      todayOrders,
      weekOrders,
      monthOrders,
      totalOrders,
      totalRevenue,
      pendingOrders,
      statusBreakdown: statusMap,
      paymentBreakdown: paymentMap
    });
  } catch (error) {
    next(error);
  }
};

exports.getEffectiveAvailableStock = getEffectiveAvailableStock;
