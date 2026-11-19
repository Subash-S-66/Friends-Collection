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
const { deductOrderStockAtomically, rollbackStockDeduction } = require('../utils/inventoryManager');

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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for payment' });
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

    // Optional Customer GST Number (uppercase & trimmed)
    customer.gstNumber = (customer.gstNumber || '').toString().trim().toUpperCase();

    // Check if Razorpay keys are configured
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(400).json({
        message: 'Razorpay is not yet configured with API credentials. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
      });
    }

    // Calculate authoritative shipping charge and global gstRate from store settings
    let freeShippingThreshold = 999;
    let standardShippingFee = 79;
    let gstRate = 5;
    try {
      const shipSetting = await Settings.findOne({ key: 'shippingCharge' }).lean();
      if (shipSetting?.value) {
        if (shipSetting.value.freeAbove !== undefined) {
          freeShippingThreshold = Number(shipSetting.value.freeAbove);
        }
        if (shipSetting.value.amount !== undefined) {
          standardShippingFee = Number(shipSetting.value.amount);
        }
      } else {
        const thresholdSetting = await Settings.findOne({ key: 'freeShippingThreshold' }).lean();
        if (thresholdSetting?.value !== undefined) {
          freeShippingThreshold = Number(thresholdSetting.value);
        }
        const feeSetting = await Settings.findOne({ key: 'shippingFee' }).lean();
        if (feeSetting?.value !== undefined) {
          standardShippingFee = Number(feeSetting.value);
        }
      }
      const invSettings = await Settings.findOne({ key: 'invoiceSettings' }).lean();
      if (invSettings && invSettings.value && invSettings.value.gstPercentage !== undefined) {
        gstRate = Number(invSettings.value.gstPercentage) || 0;
      }
    } catch (sErr) {
      console.warn('Could not read settings threshold/gstRate:', sErr);
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
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      // Determine product-level or global GST rate
      const hasSpecificGst = product.gstRate !== null && product.gstRate !== undefined && product.gstRate !== '' && !isNaN(Number(product.gstRate));
      const itemGstRate = hasSpecificGst ? Number(product.gstRate) : gstRate;
      const itemTaxable = itemGstRate > 0 ? (itemTotal / (1 + itemGstRate / 100)) : itemTotal;
      const itemGstAmount = itemGstRate > 0 ? Math.round((itemTotal - itemTaxable) * 100) / 100 : 0;

      verifiedItems.push({
        product: product._id,
        title: product.title,
        price,
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
        image: product.images[0] || '',
        gstRate: itemGstRate,
        gstAmount: itemGstAmount,
        isSpecificGst: hasSpecificGst
      });
    }

    const shippingCharge = subtotal >= freeShippingThreshold ? 0 : standardShippingFee;
    const grandTotalPaise = Math.round((subtotal + shippingCharge) * 100);
    const totalGstAmount = Math.round(verifiedItems.reduce((sum, it) => sum + (it.gstAmount || 0), 0) * 100) / 100;
    const effectiveGstRate = (subtotal - totalGstAmount) > 0
      ? Math.round((totalGstAmount / (subtotal - totalGstAmount)) * 10000) / 100
      : gstRate;

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
      gstRate: effectiveGstRate,
      gstAmount: totalGstAmount,
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

    // 7. Atomically deduct stock from Product inventory with optimistic concurrency control (OCC)
    const deduction = await deductOrderStockAtomically(draft.items);
    if (!deduction.success) {
      console.warn(`[STOCK RACE CONDITION] Payment ${razorpay_payment_id} succeeded, but stock deduction failed: ${deduction.error}`);
      draft.status = 'failed';
      draft.failureReason = deduction.error;
      await draft.save();

      return res.status(409).json({
        success: false,
        isOutOfStock: true,
        message: deduction.error || 'This product was just purchased by another shopper and is now out of stock. If payment was debited, Razorpay will refund it automatically.',
        failedItem: deduction.failedItem
      });
    }

    // 8. Place official confirmed Order in Database
    let order;
    try {
      order = await Order.create({
        items: draft.items,
        customer: draft.customer,
        user: draft.user,
        totalAmount: draft.totalAmount,
        shippingCharge: draft.shippingCharge,
        gstRate: draft.gstRate || 0,
        gstAmount: draft.gstAmount || 0,
        status: 'order_received',
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
              status: 'order_received',
              message: 'Order placed & payment verified.',
              location: 'Jamalia Boutique, Chennai',
              timestamp: new Date()
            }
          ]
        }
      });
    } catch (orderErr) {
      await rollbackStockDeduction(deduction.deductedItems).catch(() => {});
      throw orderErr;
    }

    // 8.5 Immediately wipe user's cart in database so items never resurrect
    const cartUserId = order.user || draft.user || (req.user ? req.user._id : null);
    if (cartUserId) {
      await User.findByIdAndUpdate(cartUserId, { $set: { cart: [] } }).catch(() => {});
    }
    if (req.user?._id && req.user._id.toString() !== cartUserId?.toString()) {
      await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } }).catch(() => {});
    }

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
          if (draft.customer.gstNumber) userDoc.gstNumber = draft.customer.gstNumber;

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
            userDoc.savedAddresses[existingIdx].gstNumber = draft.customer.gstNumber || '';
          } else {
            userDoc.savedAddresses.push({
              label: 'Home',
              street: cleanStreet,
              city: cleanCity,
              state: cleanState,
              pincode: cleanPincode,
              phone: draft.customer.phone,
              secondaryPhone: draft.customer.secondaryPhone || '',
              gstNumber: draft.customer.gstNumber || '',
              isDefault: userDoc.savedAddresses.length === 0
            });
          }
          await userDoc.save();
        }
      } catch (profErr) {
        console.warn('Could not sync user profile address:', profErr);
      }
    }

    // Note: Order confirmation email will be dispatched once admin confirms the order in Admin Panel.

    res.json({
      success: true,
      message: 'Payment verified successfully. Order placed and received at store.',
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

    // In production, webhook secret is strictly required to prevent forge attacks
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[SECURITY ALERT] Webhook received in production without RAZORPAY_WEBHOOK_SECRET configured.');
        return res.status(500).send('Webhook secret not configured on server.');
      }
      console.warn('[WARNING] RAZORPAY_WEBHOOK_SECRET is not set. Webhooks running in development mode.');
    } else {
      if (!signature) {
        return res.status(400).send('Missing x-razorpay-signature header');
      }
      const rawPayload = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawPayload)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        console.warn('[SECURITY ALERT] Webhook cryptographic signature mismatch.');
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
        // Validate payment currency and status
        if (payment.currency && payment.currency !== 'INR') {
          console.warn(`[SECURITY ALERT] Webhook currency mismatch: ${payment.currency}`);
          return res.status(400).send('Invalid currency');
        }
        if (payment.status && payment.status !== 'captured' && payment.status !== 'authorized') {
          console.warn(`[SECURITY ALERT] Webhook payment not captured/authorized: ${payment.status}`);
          return res.status(400).send('Invalid payment status');
        }

        // Check if order was already confirmed by client-side /verify
        const existingOrder = await Order.findOne({ 'paymentDetails.razorpayPaymentId': razorpayPaymentId });
        if (!existingOrder) {
          const draft = await PaymentDraft.findOne({ razorpayOrderId, status: 'pending' });
          if (draft) {
            // Strict Amount Parity Check: Verify amount paid matches draft grandTotalPaise
            if (payment.amount && Number(payment.amount) !== Number(draft.grandTotalPaise)) {
              console.warn(`[SECURITY ALERT] Webhook payment amount mismatch! Received: ${payment.amount}, Expected: ${draft.grandTotalPaise}`);
              draft.status = 'failed';
              draft.failureReason = 'Amount mismatch detected in webhook';
              await draft.save();
              return res.status(400).send('Amount mismatch');
            }

            // Atomically deduct stock with OCC
            const deduction = await deductOrderStockAtomically(draft.items);
            if (deduction.success) {
              try {
                // Create confirmed order
                const webhookOrder = await Order.create({
                  items: draft.items,
                  customer: draft.customer,
                  user: draft.user,
                  totalAmount: draft.totalAmount,
                  shippingCharge: draft.shippingCharge,
                  gstRate: draft.gstRate || 0,
                  gstAmount: draft.gstAmount || 0,
                  status: 'order_received',
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
                        status: 'order_received',
                        message: 'Order placed & payment verified.',
                        location: 'Jamalia Boutique, Chennai',
                        timestamp: new Date()
                      }
                    ]
                  },
                  securityAudit: {
                    ipAddress: (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '').toString().slice(0, 50),
                    userAgent: 'Razorpay-Webhook'
                  }
                });

                if (draft.sessionId) {
                  await StockReservation.updateMany(
                    { sessionId: draft.sessionId, status: 'active' },
                    { status: 'released' }
                  );
                }

                if (draft.user) {
                  await User.findByIdAndUpdate(draft.user, { $set: { cart: [] } }).catch(() => {});
                }

                draft.status = 'completed';
                await draft.save();

                // Note: Order confirmation email will be dispatched once admin confirms the order in Admin Panel.
              } catch (orderErr) {
                await rollbackStockDeduction(deduction.deductedItems).catch(() => {});
                throw orderErr;
              }
            } else {
              console.error(`[WEBHOOK STOCK COLLISION] Stock exhausted for draft ${draft.razorpayOrderId}: ${deduction.error}`);
              draft.status = 'failed';
              draft.failureReason = deduction.error;
              await draft.save();
            }
          }
        }
      }
    }

    // =========================================================================
    // REFUND EVENTS (When merchant taps "Refund" in Razorpay Dashboard)
    // Supported: refund.processed, refund.created, payment.refunded
    // =========================================================================
    if (
      event === 'refund.processed' ||
      event === 'refund.created' ||
      event === 'payment.refunded'
    ) {
      const refundEntity = payload.payload?.refund?.entity;
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentId = refundEntity?.payment_id || paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const refundId = refundEntity?.id || '';
      const refundAmountPaise = refundEntity?.amount || paymentEntity?.amount_refunded || 0;
      const refundAmountRs = refundAmountPaise > 0 ? (refundAmountPaise / 100) : 0;
      const refundArn = refundEntity?.acquirer_data?.arn || '';
      const rawRefundStatus = refundEntity?.status || paymentEntity?.refund_status || '';

      // Check if refund is fully processed or still under process:
      // When merchant initiates refund: Razorpay sends refund.created / payment.refunded (status = 'processing' / 'created').
      // When bank completes credit: Razorpay sends refund.processed (status = 'processed') with ARN.
      const isFullyProcessed = event === 'refund.processed' || rawRefundStatus === 'processed';
      const targetPaymentStatus = isFullyProcessed ? 'refunded' : 'refund_processing';
      const refundStatus = isFullyProcessed ? 'processed' : (rawRefundStatus || 'processing');

      if (paymentId || razorpayOrderId) {
        const order = await Order.findOne({
          $or: [
            ...(paymentId ? [{ 'paymentDetails.razorpayPaymentId': paymentId }] : []),
            ...(razorpayOrderId ? [{ 'paymentDetails.razorpayOrderId': razorpayOrderId }] : [])
          ]
        });

        if (order) {
          // If the order has already achieved final 'refunded' state, do not downgrade it back to processing
          if (order.paymentStatus !== 'refunded') {
            order.paymentStatus = targetPaymentStatus;
          }

          if (!order.paymentDetails) order.paymentDetails = {};
          if (refundId) order.paymentDetails.refundId = refundId;
          if (refundAmountRs > 0) order.paymentDetails.refundAmount = refundAmountRs;
          order.paymentDetails.refundStatus = isFullyProcessed ? 'processed' : (order.paymentDetails.refundStatus === 'processed' ? 'processed' : refundStatus);
          if (refundArn) order.paymentDetails.refundArn = refundArn;
          if (isFullyProcessed || !order.paymentDetails.refundedAt) {
            order.paymentDetails.refundedAt = new Date();
          }

          if (!order.tracking) order.tracking = { statusHistory: [] };
          if (!Array.isArray(order.tracking.statusHistory)) order.tracking.statusHistory = [];

          if (isFullyProcessed) {
            const refundNote = `[Razorpay Webhook: ${event}] Refund of ₹${refundAmountRs.toLocaleString('en-IN')} confirmed & completed by bank (Refund ID: ${refundId || 'N/A'}${refundArn ? `, Bank ARN: ${refundArn}` : ''}). Payment marked as REFUNDED.`;
            if (!order.paymentNotes || !order.paymentNotes.includes(refundNote)) {
              order.paymentNotes = order.paymentNotes ? `${order.paymentNotes}\n${refundNote}` : refundNote;
            }

            // Deduplicate status milestone so multiple webhooks don't flood the logs
            const alreadyLoggedConfirmed = order.tracking.statusHistory.some(h =>
              h.message && (
                (refundId && h.message.includes(refundId) && h.message.includes('completed')) ||
                (h.message.includes('REFUNDED') && h.message.includes('completed'))
              )
            );
            if (!alreadyLoggedConfirmed) {
              order.tracking.statusHistory.push({
                status: order.status,
                message: `Refund of ₹${refundAmountRs.toLocaleString('en-IN')} completed & credited to your original payment account.`,
                location: 'Jamalia Boutique',
                timestamp: new Date()
              });
            }
          } else {
            // Refund is initiated and under process (banking window: 5-7 working days)
            const refundNote = `[Razorpay Webhook: ${event}] Refund of ₹${refundAmountRs.toLocaleString('en-IN')} initiated on Razorpay Dashboard (Refund ID: ${refundId || 'N/A'}). Status: Under Process (5-7 working days).`;
            if (!order.paymentNotes || !order.paymentNotes.includes(refundNote)) {
              order.paymentNotes = order.paymentNotes ? `${order.paymentNotes}\n${refundNote}` : refundNote;
            }

            // Deduplicate status milestone
            const alreadyLoggedProcessing = order.tracking.statusHistory.some(h =>
              h.message && (
                (refundId && h.message.includes(refundId) && (h.message.includes('5 to 7 working days') || h.message.includes('under process'))) ||
                (h.message.includes('initiated') && h.message.includes('5 to 7 working days'))
              )
            );
            if (!alreadyLoggedProcessing) {
              order.tracking.statusHistory.push({
                status: order.status,
                message: `Refund of ₹${refundAmountRs.toLocaleString('en-IN')} initiated (Refund ID: ${refundId || 'N/A'}). Refund under process — bank credit usually takes 5 to 7 working days.`,
                location: 'Jamalia Boutique',
                timestamp: new Date()
              });
            }
          }

          // If order has not yet been cancelled or delivered, auto-cancel order & restore inventory stock
          if (['order_received', 'pending', 'yet_to_move', 'confirmed'].includes(order.status)) {
            order.status = 'cancelled';
            for (const item of order.items) {
              if (item.product) {
                const prod = await Product.findById(item.product);
                if (prod) {
                  prod.stock = (prod.stock || 0) + item.quantity;
                  if (prod.variants && prod.variants.length > 0) {
                    const vIndex = prod.variants.findIndex(
                      v => (!item.size || v.size === item.size) && (!item.color || v.color === item.color)
                    );
                    if (vIndex >= 0) {
                      prod.variants[vIndex].stock = (prod.variants[vIndex].stock || 0) + item.quantity;
                    }
                  }
                  await prod.save();
                }
              }
            }

            const alreadyLoggedCancel = order.tracking.statusHistory.some(h =>
              h.message && h.message.toLowerCase().includes('order cancelled')
            );
            if (!alreadyLoggedCancel) {
              order.tracking.statusHistory.push({
                status: 'cancelled',
                message: 'Order cancelled.',
                location: 'Jamalia Boutique',
                timestamp: new Date()
              });
            }
          }

          await order.save();
          console.log(`[REFUND WEBHOOK] Order #${order.orderId} successfully updated (paymentStatus=${order.paymentStatus}, refundId=${refundId}).`);
        } else {
          console.warn(`[REFUND WEBHOOK] No matching order found for payment ${paymentId} / razorpayOrder ${razorpayOrderId}`);
        }
      }
    }

    // =========================================================================
    // REFUND FAILED EVENT
    // =========================================================================
    if (event === 'refund.failed') {
      const refundEntity = payload.payload?.refund?.entity;
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentId = refundEntity?.payment_id || paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const refundId = refundEntity?.id || '';
      const failureReason = refundEntity?.error_description || 'Refund failed on banking network';

      if (paymentId || razorpayOrderId) {
        const order = await Order.findOne({
          $or: [
            ...(paymentId ? [{ 'paymentDetails.razorpayPaymentId': paymentId }] : []),
            ...(razorpayOrderId ? [{ 'paymentDetails.razorpayOrderId': razorpayOrderId }] : [])
          ]
        });

        if (order) {
          const failNote = `[Razorpay Webhook: refund.failed] Refund attempt (${refundId}) failed: ${failureReason}`;
          order.paymentNotes = order.paymentNotes ? `${order.paymentNotes}\n${failNote}` : failNote;
          await order.save();
          console.warn(`[REFUND FAILED WEBHOOK] Order #${order.orderId}: ${failureReason}`);
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
