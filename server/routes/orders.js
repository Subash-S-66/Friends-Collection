const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  trackOrder,
  getOrdersByPhone,
  adminGetOrders,
  adminGetOrder,
  updateOrderStatus,
  getOrderStats,
  reserveCheckoutStock,
  releaseCheckoutStock,
  getReservationStatus
} = require('../controllers/orderController');
const { auth, optionalAuth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const { orderLimiter, authLimiter, pdfLimiter } = require('../middleware/rateLimiter');

// Public / Guest
router.post('/reserve', optionalAuth, reserveCheckoutStock);
router.post('/release-hold', optionalAuth, releaseCheckoutStock);
router.get('/reservation/:sessionId', optionalAuth, getReservationStatus);
router.post('/', orderLimiter, optionalAuth, placeOrder);
router.get('/track/:orderId', authLimiter, optionalAuth, trackOrder);
router.get('/by-phone/:phone', authLimiter, optionalAuth, getOrdersByPhone);

// Sample Order for PDF Preview
const SAMPLE_ORDER = {
  orderId: 'FC-SAMPLE-8899',
  createdAt: new Date(),
  customer: {
    name: 'Sample Customer',
    phone: '9876543210',
    secondaryPhone: '9500757024',
    email: 'customer@example.com',
    address: {
      street: '4th Main Road, Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040'
    }
  },
  items: [
    {
      title: 'Kanchipuram Pure Silk Bridal Saree (Crimson Red)',
      size: 'Free Size',
      color: 'Crimson Wine & Gold',
      quantity: 1,
      price: 3499,
      gstRate: null,
      isSpecificGst: false
    },
    {
      title: 'Zari Embroidered Designer Anarkali Suit',
      size: 'M',
      color: 'Rose Gold',
      quantity: 1,
      price: 1899,
      gstRate: 12,
      isSpecificGst: true
    }
  ],
  totalAmount: 5398,
  shippingCharge: 0,
  paymentMethod: 'razorpay',
  paymentStatus: 'paid',
  status: 'confirmed',
  paymentDetails: {
    razorpayPaymentId: 'pay_sample_test_998124'
  }
};

// Sample PDF Invoice Preview (GET: using saved settings, POST: using in-flight draft settings)
router.get('/invoice/sample/pdf', optionalAuth, pdfLimiter, async (req, res, next) => {
  try {
    const { generateInvoicePdf } = require('../utils/invoiceGenerator');
    const pdfBuffer = await generateInvoicePdf(SAMPLE_ORDER);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Sample-Tax-Invoice.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.post('/invoice/sample/pdf', optionalAuth, pdfLimiter, async (req, res, next) => {
  try {
    const { generateInvoicePdf } = require('../utils/invoiceGenerator');
    const customSettings = req.body?.invoiceSettings || null;
    const pdfBuffer = await generateInvoicePdf(SAMPLE_ORDER, customSettings);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Sample-Tax-Invoice.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// Helper to verify invoice download authorization & prevent IDOR data leaks
const canAccessOrderInvoice = (order, req) => {
  if (!order) return false;
  // 1. Store Administrator
  if (req.user && req.user.role === 'admin') return true;
  // 2. Account owner matched by MongoDB User ID
  if (req.user && order.user && req.user._id.toString() === order.user.toString()) return true;
  // 3. User matched by account email
  if (req.user?.email && order.customer?.email && req.user.email.toLowerCase() === order.customer.email.toLowerCase()) return true;
  // 4. User matched by account phone
  if (req.user?.phone && order.customer?.phone) {
    const userPhone = req.user.phone.replace(/\D/g, '').slice(-10);
    const orderPhone = order.customer.phone.replace(/\D/g, '').slice(-10);
    if (userPhone && orderPhone && userPhone === orderPhone) return true;
  }
  // 5. Guest customer providing verified phone number (?phone=...)
  const queryPhone = (req.query?.phone || '').replace(/\D/g, '').slice(-10);
  if (queryPhone && queryPhone.length === 10) {
    const orderPhone = (order.customer?.phone || '').replace(/\D/g, '').slice(-10);
    const orderSecPhone = (order.customer?.secondaryPhone || '').replace(/\D/g, '').slice(-10);
    if (queryPhone === orderPhone || queryPhone === orderSecPhone) return true;
  }
  return false;
};

// Public PDF Invoice Download (Protected against IDOR & unauthorized PII access)
router.get('/:orderId/invoice.pdf', optionalAuth, pdfLimiter, async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { generateInvoicePdf } = require('../utils/invoiceGenerator');
    const cleanId = (req.params.orderId || '').trim();
    const order = await Order.findOne({
      $or: [
        { orderId: cleanId },
        { orderId: cleanId.toUpperCase() },
        { 'paymentDetails.razorpayOrderId': cleanId }
      ]
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!canAccessOrderInvoice(order, req)) {
      return res.status(403).json({
        message: 'Access denied: To download this tax invoice, please sign in to the purchasing account or provide your billing phone number.'
      });
    }

    const pdfBuffer = await generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.get('/invoice/:orderId/pdf', optionalAuth, pdfLimiter, async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { generateInvoicePdf } = require('../utils/invoiceGenerator');
    const cleanId = (req.params.orderId || '').trim();
    const order = await Order.findOne({
      $or: [
        { orderId: cleanId },
        { orderId: cleanId.toUpperCase() },
        { 'paymentDetails.razorpayOrderId': cleanId }
      ]
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!canAccessOrderInvoice(order, req)) {
      return res.status(403).json({
        message: 'Access denied: To download this tax invoice, please sign in to the purchasing account or provide your billing phone number.'
      });
    }

    const pdfBuffer = await generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// Logged-in user
router.get('/my', auth, getMyOrders);

// Admin
router.get('/admin/stats', auth, admin, getOrderStats);
router.get('/admin/all', auth, admin, adminGetOrders);
router.get('/admin/:id', auth, admin, adminGetOrder);
router.put('/admin/:id/status', auth, admin, updateOrderStatus);

module.exports = router;
