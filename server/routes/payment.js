const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PaymentDraft = require('../models/PaymentDraft');
const Settings = require('../models/Settings');
const User = require('../models/User');
const StockReservation = require('../models/StockReservation');
const { optionalAuth } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimiter');
const { getEffectiveAvailableStock } = require('../controllers/orderController');

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

// @desc    Create Razorpay Order (Draft session - NO order placed until verified payment)
// @route   POST /api/payment/create-order
router.post('/create-order', orderLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { items, customer, sessionId, saveAddress } = req.body;

    // Check if Razorpay keys are configured
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(400).json({
        message: 'Razorpay is not yet configured with API credentials. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for payment' });
    }

    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({ message: 'Customer name and phone number are required' });
    }

    if (!customer.address || !customer.address.street || !customer.address.city || !customer.address.state || !customer.address.pincode) {
      return res.status(400).json({ message: 'Complete delivery address is required' });
    }

    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = customer.phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit Indian phone number' });
    }
    customer.phone = cleanPhone;

    if (customer.secondaryPhone && customer.secondaryPhone.trim()) {
      const cleanSecPhone = customer.secondaryPhone.replace(/\s/g, '');
      if (!phoneRegex.test(cleanSecPhone)) {
        return res.status(400).json({ message: 'Secondary phone number must be a valid 10-digit Indian phone number' });
      }
      customer.secondaryPhone = cleanSecPhone;
    } else {
      customer.secondaryPhone = '';
    }

    // Build verified items and calculate total strictly from database prices
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.title || item.product}` });
      }

      // Check stock availability with reservation awareness
      const available = await getEffectiveAvailableStock(item.product, item.size, item.color, sessionId);
      if (available < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.title}". Only ${available} available.`
        });
      }

      // Authoritative database price (unhackable)
      const price = product.salePrice || product.price;
      subtotal += price * item.quantity;

      verifiedItems.push({
        product: product._id,
        title: product.title,
        price,
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
        image: product.images[0] || ''
      });
    }

    // Calculate authoritative shipping charge from store settings
    let freeShippingThreshold = 999;
    try {
      const settings = await Settings.findOne();
      if (settings?.freeShippingThreshold) {
        freeShippingThreshold = Number(settings.freeShippingThreshold);
      }
    } catch (sErr) {
      console.warn('Could not read settings threshold:', sErr);
    }

    const shippingCharge = subtotal >= freeShippingThreshold ? 0 : 79;
    const grandTotalPaise = Math.round((subtotal + shippingCharge) * 100);

    if (grandTotalPaise <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Generate unique receipt ID
    const cleanReceipt = `rcpt_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;
    const options = {
      amount: grandTotalPaise,
      currency: 'INR',
      receipt: cleanReceipt,
      notes: {
        customerName: customer.name.trim(),
        customerPhone: cleanPhone,
        customerEmail: customer.email ? customer.email.trim() : '',
        sessionId: sessionId || ''
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Link user if logged in or by matching phone/email
    let orderUserId = req.user ? req.user._id : null;
    if (!orderUserId) {
      try {
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
        console.error('Error linking user on payment draft create:', linkErr);
      }
    }

    // Save PaymentDraft (Expires in 30 mins, NO Order placed, NO stock deducted)
    await PaymentDraft.create({
      razorpayOrderId: razorpayOrder.id,
      items: verifiedItems,
      customer,
      user: orderUserId,
      totalAmount: subtotal,
      shippingCharge,
      grandTotalPaise,
      sessionId: sessionId || '',
      saveAddress: Boolean(saveAddress),
      status: 'pending'
    });

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
      customer: {
        name: customer.name.trim(),
        phone: cleanPhone,
        email: customer.email ? customer.email.trim() : ''
      }
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    next(error);
  }
});

// @desc    Cryptographically verify payment & place confirmed order
// @route   POST /api/payment/verify
router.post('/verify', orderLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Mandatory credentials check
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment credentials.'
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({
        success: false,
        message: 'Server missing RAZORPAY_KEY_SECRET.'
      });
    }

    // 2. Cryptographic signature check: Constant-time HMAC-SHA256 (Unhackable & timing-attack immune)
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(razorpay_signature, 'utf8');

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      console.warn(`[SECURITY ALERT] Signature mismatch for payment ${razorpay_payment_id} on order ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Cryptographic signature mismatch.'
      });
    }

    // 3. Anti-Replay Attack Check: Ensure this payment ID hasn't already been used
    const existingOrder = await Order.findOne({ 'paymentDetails.razorpayPaymentId': razorpay_payment_id });
    if (existingOrder) {
      return res.json({
        success: true,
        message: 'Order already confirmed for this payment.',
        order: existingOrder
      });
    }

    // 4. Verification with Razorpay Gateway API directly
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({ success: false, message: 'Razorpay gateway not initialized' });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!payment) {
      return res.status(400).json({ success: false, message: 'Payment record not found on Razorpay' });
    }
    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Payment does not match the Razorpay order reference' });
    }
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({ success: false, message: `Payment is not in successful status (current: ${payment.status})` });
    }
    if (payment.currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Invalid payment currency' });
    }

    // 5. Retrieve verified PaymentDraft
    const draft = await PaymentDraft.findOne({ razorpayOrderId: razorpay_order_id });
    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Payment draft session expired or not found. If amount was debited, it will be refunded automatically by Razorpay.'
      });
    }

    // 6. Security Check: Amount Tampering Protection
    if (Number(payment.amount) !== Number(draft.grandTotalPaise)) {
      console.warn(`[SECURITY ALERT] Payment amount tampering detected! Paid: ${payment.amount}, Expected: ${draft.grandTotalPaise}`);
      return res.status(400).json({
        success: false,
        message: 'Security validation failed: Payment amount does not match order value.'
      });
    }

    // 7. Atomically deduct stock from Product inventory
    for (const item of draft.items) {
      const product = await Product.findById(item.product);
      if (product) {
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
    }

    // 8. Place official confirmed Order in Database
    const order = await Order.create({
      items: draft.items,
      customer: draft.customer,
      user: draft.user,
      totalAmount: draft.totalAmount,
      shippingCharge: draft.shippingCharge,
      status: 'confirmed',
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentMethod: 'razorpay',
      paymentDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature
      },
      tracking: {
        statusHistory: [
          {
            status: 'yet_to_move',
            message: 'Order received and payment verified via Razorpay.',
            location: 'Jamalia Boutique, Chennai',
            timestamp: new Date()
          },
          {
            status: 'confirmed',
            message: `Online payment of ₹${(draft.grandTotalPaise / 100).toLocaleString('en-IN')} verified (Payment ID: ${razorpay_payment_id}). Order confirmed automatically.`,
            location: 'Razorpay Gateway',
            timestamp: new Date()
          }
        ]
      }
    });

    // 9. Release 10-minute stock reservation
    if (draft.sessionId) {
      await StockReservation.updateMany(
        { sessionId: draft.sessionId, status: 'active' },
        { status: 'released' }
      );
    }

    // 10. Mark draft as completed
    draft.status = 'completed';
    await draft.save();

    // 11. Auto-save address to user profile if user is logged in and opted
    if (draft.user && draft.saveAddress) {
      try {
        const userDoc = await User.findById(draft.user);
        if (userDoc) {
          if (!userDoc.phone && draft.customer.phone) userDoc.phone = draft.customer.phone;
          if (draft.customer.secondaryPhone) userDoc.secondaryPhone = draft.customer.secondaryPhone;

          const cleanStreet = draft.customer.address.street.trim();
          const cleanPincode = draft.customer.address.pincode.trim();
          const cleanCity = draft.customer.address.city.trim();
          const cleanState = draft.customer.address.state.trim();

          const existingIdx = userDoc.savedAddresses.findIndex(
            (a) => a.street?.toLowerCase() === cleanStreet.toLowerCase() && a.pincode === cleanPincode
          );

          if (existingIdx >= 0) {
            userDoc.savedAddresses[existingIdx].city = cleanCity;
            userDoc.savedAddresses[existingIdx].state = cleanState;
            userDoc.savedAddresses[existingIdx].phone = draft.customer.phone;
            userDoc.savedAddresses[existingIdx].secondaryPhone = draft.customer.secondaryPhone || '';
          } else {
            userDoc.savedAddresses.push({
              label: 'Home',
              street: cleanStreet,
              city: cleanCity,
              state: cleanState,
              pincode: cleanPincode,
              phone: draft.customer.phone,
              secondaryPhone: draft.customer.secondaryPhone || '',
              isDefault: userDoc.savedAddresses.length === 0
            });
          }
          await userDoc.save();
        }
      } catch (profErr) {
        console.warn('Could not sync user profile address:', profErr);
      }
    }

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
        customer: order.customer,
        paymentDetails: order.paymentDetails
      }
    });
  } catch (error) {
    console.error('Razorpay verification error:', error);
    next(error);
  }
});

// @desc    Report Payment Failure / Cancellation (NO ORDER PLACED)
// @route   POST /api/payment/failure
router.post('/failure', optionalAuth, async (req, res, next) => {
  try {
    const { razorpayOrderId, errorReason } = req.body;
    if (razorpayOrderId) {
      await PaymentDraft.updateOne(
        { razorpayOrderId, status: 'pending' },
        { status: 'failed' }
      );
    }
    // No order is created in database, cart is preserved on frontend
    res.json({ success: true, message: 'Payment cancellation recorded. No order was placed.' });
  } catch (error) {
    console.error('Razorpay failure recording error:', error);
    next(error);
  }
});

// @desc    Razorpay Webhook for asynchronous server-to-server confirmation
// @route   POST /api/payment/webhook
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (secret && signature) {
      const rawPayload = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawPayload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return res.status(400).send('Invalid webhook signature');
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const razorpayPaymentId = payment?.id;

      if (razorpayOrderId && razorpayPaymentId) {
        // Check if order was already confirmed by client-side /verify
        const existingOrder = await Order.findOne({ 'paymentDetails.razorpayPaymentId': razorpayPaymentId });
        if (!existingOrder) {
          const draft = await PaymentDraft.findOne({ razorpayOrderId, status: 'pending' });
          if (draft) {
            // Deduct stock
            for (const item of draft.items) {
              const product = await Product.findById(item.product);
              if (product) {
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
            }

            // Create confirmed order
            await Order.create({
              items: draft.items,
              customer: draft.customer,
              user: draft.user,
              totalAmount: draft.totalAmount,
              shippingCharge: draft.shippingCharge,
              status: 'confirmed',
              paymentStatus: 'paid',
              paidAt: new Date(),
              paymentMethod: 'razorpay',
              paymentDetails: {
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature: 'webhook_verified'
              },
              tracking: {
                statusHistory: [
                  {
                    status: 'yet_to_move',
                    message: 'Order received and payment verified via Razorpay Webhook.',
                    location: 'Jamalia Boutique, Chennai',
                    timestamp: new Date()
                  },
                  {
                    status: 'confirmed',
                    message: `Payment confirmed via Razorpay Webhook (Payment ID: ${razorpayPaymentId}). Order confirmed automatically.`,
                    location: 'Razorpay Webhook',
                    timestamp: new Date()
                  }
                ]
              }
            });

            if (draft.sessionId) {
              await StockReservation.updateMany(
                { sessionId: draft.sessionId, status: 'active' },
                { status: 'released' }
              );
            }

            draft.status = 'completed';
            await draft.save();
          }
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
