const NotificationSubscription = require('../models/NotificationSubscription');
const Product = require('../models/Product');
const {
  sendBackInStockSubscriptionEmail,
  sendBackInStockAlertEmail
} = require('../utils/emailService');

// @desc    Subscribe to back in stock notification
// @route   POST /api/notifications/subscribe
exports.subscribeBackInStock = async (req, res, next) => {
  try {
    const { productId, color, size, email: bodyEmail, phone, name } = req.body;
    const email = (req.user?.email || bodyEmail || '').trim().toLowerCase();
    const contactPhone = (phone || req.user?.phone || '').trim();
    const customerName = (name || req.user?.name || '').trim();

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required to subscribe' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = {
      color: color || '',
      size: size || ''
    };

    // Upsert subscription
    let subscription = await NotificationSubscription.findOne({
      email,
      product: product._id,
      'variant.color': variant.color,
      'variant.size': variant.size
    });

    if (subscription) {
      if (contactPhone) subscription.phone = contactPhone;
      if (customerName) subscription.name = customerName;
      if (req.user?._id && !subscription.user) subscription.user = req.user._id;

      // If already notified before, reset notification status
      if (subscription.notified) {
        subscription.notified = false;
        subscription.notifiedAt = null;
      }
      await subscription.save();
    } else {
      subscription = await NotificationSubscription.create({
        user: req.user ? req.user._id : null,
        email,
        phone: contactPhone,
        name: customerName,
        product: product._id,
        variant,
        notified: false
      });
    }

    // Send confirmation email via Nodemailer
    sendBackInStockSubscriptionEmail({
      to: email,
      name: customerName,
      phone: contactPhone,
      product,
      variant
    }).catch(err => {
      console.error('Error sending subscription confirmation email:', err.message);
    });

    res.status(200).json({
      success: true,
      message: `You're on the waitlist! We'll email you the moment "${product.title}" returns to stock.`,
      subscription
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if current user/email is subscribed
// @route   GET /api/notifications/status
exports.checkSubscription = async (req, res, next) => {
  try {
    const { productId, color, size } = req.query;
    const email = req.user?.email;

    if (!email || !productId) {
      return res.json({ subscribed: false });
    }

    const subscription = await NotificationSubscription.findOne({
      email: email.toLowerCase(),
      product: productId,
      'variant.color': color || '',
      'variant.size': size || '',
      notified: false
    });

    res.json({ subscribed: Boolean(subscription) });
  } catch (error) {
    next(error);
  }
};

// Helper: Notify all pending waitlisted customers for a product / variant
exports.notifyWaitlistedCustomers = async (productId, color = '', size = '') => {
  try {
    const product = await Product.findById(productId);
    if (!product || (product.stock !== undefined && product.stock <= 0)) {
      return { notifiedCount: 0 };
    }

    const query = {
      product: product._id,
      notified: false
    };

    if (color) query['variant.color'] = color;
    if (size) query['variant.size'] = size;

    const subscriptions = await NotificationSubscription.find(query).populate('user', 'name email phone');
    if (!subscriptions || subscriptions.length === 0) {
      return { notifiedCount: 0 };
    }

    let successCount = 0;
    for (const sub of subscriptions) {
      try {
        const recipientName = sub.name || sub.user?.name || '';
        const recipientPhone = sub.phone || sub.user?.phone || '';
        await sendBackInStockAlertEmail({
          to: sub.email,
          name: recipientName,
          phone: recipientPhone,
          product,
          variant: sub.variant
        });
        // Clear request completely after notifying once so it never re-sends even if stock cycles
        await NotificationSubscription.findByIdAndDelete(sub._id);
        successCount++;
      } catch (err) {
        console.error(`Failed to send alert to ${sub.email}:`, err.message);
      }
    }

    console.log(`📢 [Restock Alert] Successfully emailed ${successCount} waitlisted customers for "${product.title}"`);
    return { notifiedCount: successCount };
  } catch (error) {
    console.error('❌ [Restock Alert Error] notifyWaitlistedCustomers:', error);
    return { notifiedCount: 0, error: error.message };
  }
};

// @desc    Notify subscribers when an item is restocked (admin)
// @route   POST /api/notifications/admin/notify/:productId
exports.notifySubscribers = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { color, size } = req.body;

    const result = await exports.notifyWaitlistedCustomers(productId, color, size);
    if (result.notifiedCount === 0) {
      return res.json({
        message: 'No pending waitlist subscribers for this item or item still out of stock',
        notifiedCount: 0
      });
    }

    res.json({
      message: `Successfully notified ${result.notifiedCount} waitlisted customers via email!`,
      notifiedCount: result.notifiedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all subscriptions for admin overview
// @route   GET /api/notifications/admin/all
exports.adminGetSubscriptions = async (req, res, next) => {
  try {
    const subs = await NotificationSubscription.find()
      .populate('product', 'title slug images price salePrice stock')
      .populate('user', 'name phone')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(subs);
  } catch (error) {
    next(error);
  }
};
