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
    const { productId, color, size, email: bodyEmail } = req.body;
    const email = (req.user?.email || bodyEmail || '').trim().toLowerCase();

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
      // If already notified before, reset notification status
      if (subscription.notified) {
        subscription.notified = false;
        subscription.notifiedAt = null;
        await subscription.save();
      }
    } else {
      subscription = await NotificationSubscription.create({
        user: req.user ? req.user._id : null,
        email,
        product: product._id,
        variant,
        notified: false
      });
    }

    // Send confirmation email via Nodemailer
    await sendBackInStockSubscriptionEmail({
      to: email,
      name: req.user?.name,
      product,
      variant
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

// @desc    Notify subscribers when an item is restocked (admin)
// @route   POST /api/notifications/admin/notify/:productId
exports.notifySubscribers = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { color, size } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const query = {
      product: product._id,
      notified: false
    };

    if (color) query['variant.color'] = color;
    if (size) query['variant.size'] = size;

    const subscriptions = await NotificationSubscription.find(query).populate('user', 'name email');
    if (subscriptions.length === 0) {
      return res.json({
        message: 'No pending waitlist subscribers for this item',
        notifiedCount: 0
      });
    }

    let successCount = 0;
    for (const sub of subscriptions) {
      try {
        await sendBackInStockAlertEmail({
          to: sub.email,
          name: sub.user?.name,
          product,
          variant: sub.variant
        });
        sub.notified = true;
        sub.notifiedAt = new Date();
        await sub.save();
        successCount++;
      } catch (err) {
        console.error(`Failed to send alert to ${sub.email}:`, err.message);
      }
    }

    res.json({
      message: `Successfully notified ${successCount} waitlisted customers via email!`,
      notifiedCount: successCount
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
