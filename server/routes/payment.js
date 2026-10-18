const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const { optionalAuth } = require('../middleware/auth');

// Helper to get Razorpay instance safely
function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    return null;
  }
  return new Razorpay({ key_id, key_secret });
}

// @desc    Get public Razorpay Key ID
// @route   GET /api/payment/razorpay-key
router.get('/razorpay-key', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
  res.json({
    keyId,
    isConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
router.post('/create-order', optionalAuth, async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required to initiate online payment' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found in database' });
    }

    // Check if keys are configured
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(400).json({
        message: 'Razorpay is not yet configured with API credentials. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
      });
    }

    // Amount in Paise (INR)
    const totalAmountWithShipping = Math.round((Number(order.totalAmount || 0) + Number(order.shippingCharge || 0)) * 100);

    if (totalAmountWithShipping <= 0) {
      return res.status(400).json({ message: 'Invalid order amount for online payment' });
    }

    // Generate Razorpay Order
    const cleanReceipt = `rcpt_${String(order.orderId).replace(/[^a-zA-Z0-9_-]/g, '').slice(-20)}_${Date.now().toString().slice(-4)}`;
    const options = {
      amount: totalAmountWithShipping,
      currency: 'INR',
      receipt: cleanReceipt,
      notes: {
        orderId: order.orderId,
        customerName: order.customer?.name || '',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || ''
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Update order with razorpayOrderId & paymentMethod
    if (!order.paymentDetails) {
      order.paymentDetails = {};
    }
    order.paymentDetails.razorpayOrderId = razorpayOrder.id;
    order.paymentMethod = 'razorpay';
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.orderId,
      customer: {
        name: order.customer?.name || '',
        phone: order.customer?.phone || '',
        email: order.customer?.email || ''
      }
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    next(error);
  }
});

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payment/verify
router.post('/verify', optionalAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay verification credentials (order_id, payment_id, or signature).'
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({
        success: false,
        message: 'Server missing RAZORPAY_KEY_SECRET to verify payment signature.'
      });
    }

    // Cryptographic signature check: HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn(`[Razorpay Security Alert] Signature mismatch for Order #${orderId}`);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Signature authenticity mismatch.'
      });
    }

    // Find order in database
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${orderId} not found in database.`
      });
    }

    // Update order to PAID and automatically CONFIRM order
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.paidAt = new Date();
    order.paymentMethod = 'razorpay';
    order.paymentDetails = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    };

    // Append live milestone tracking
    if (!order.tracking) {
      order.tracking = { statusHistory: [] };
    }
    if (!Array.isArray(order.tracking.statusHistory)) {
      order.tracking.statusHistory = [];
    }
    order.tracking.statusHistory.push({
      status: 'confirmed',
      message: `Online payment verified via Razorpay (Payment ID: ${razorpay_payment_id}). Order confirmed automatically.`,
      location: 'Razorpay Gateway',
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment verified successfully and order confirmed automatically.',
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        shippingCharge: order.shippingCharge,
        customer: order.customer
      }
    });
  } catch (error) {
    console.error('Razorpay verification error:', error);
    next(error);
  }
});

// @desc    Report Payment Failure / Cancellation
// @route   POST /api/payment/failure
router.post('/failure', optionalAuth, async (req, res, next) => {
  try {
    const { orderId, errorReason, paymentDetails } = req.body;
    if (orderId) {
      const order = await Order.findOne({ orderId });
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'failed';
        order.paymentNotes = errorReason || 'Payment dismissed or failed at Razorpay checkout';
        if (paymentDetails) {
          order.paymentDetails = { ...order.paymentDetails, ...paymentDetails };
        }
        await order.save();
      }
    }
    res.json({ success: true, message: 'Payment failure recorded' });
  } catch (error) {
    console.error('Razorpay failure recording error:', error);
    next(error);
  }
});

// @desc    Razorpay Webhook for asynchronous server-to-server confirmation
// @route   POST /api/payment/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(req.body)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).send('Invalid webhook signature');
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload?.payment?.entity;
      const orderId = payment?.notes?.orderId;
      const razorpayPaymentId = payment?.id;
      const razorpayOrderId = payment?.order_id;

      if (orderId) {
        const order = await Order.findOne({ orderId });
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'confirmed';
          order.paidAt = new Date();
          order.paymentMethod = 'razorpay';
          order.paymentDetails = {
            razorpayOrderId: razorpayOrderId || order.paymentDetails?.razorpayOrderId || '',
            razorpayPaymentId: razorpayPaymentId || '',
            razorpaySignature: 'webhook_verified'
          };
          if (!order.tracking) order.tracking = { statusHistory: [] };
          if (!Array.isArray(order.tracking.statusHistory)) order.tracking.statusHistory = [];
          order.tracking.statusHistory.push({
            status: 'confirmed',
            message: `Payment confirmed via Razorpay Webhook (Payment ID: ${razorpayPaymentId}). Order confirmed automatically.`,
            location: 'Razorpay Webhook',
            timestamp: new Date()
          });
          await order.save();
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook handler error');
  }
});

module.exports = router;
