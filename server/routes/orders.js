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
const { orderLimiter } = require('../middleware/rateLimiter');

// Public / Guest
router.post('/reserve', optionalAuth, reserveCheckoutStock);
router.post('/release-hold', optionalAuth, releaseCheckoutStock);
router.get('/reservation/:sessionId', optionalAuth, getReservationStatus);
router.post('/', orderLimiter, optionalAuth, placeOrder);
router.get('/track/:orderId', trackOrder);
router.get('/by-phone/:phone', getOrdersByPhone);

// Sample Order for PDF Preview
const SAMPLE_ORDER = {
  orderId: 'FC-SAMPLE-8899',
  createdAt: new Date(),
  customer: {
    name: 'Priya Sharma',
    phone: '9876543210',
    secondaryPhone: '9500757024',
    email: 'priya.sharma@example.com',
    address: {
      street: 'Flat 4B, Lotus Apartments, 2nd Main Road, Anna Nagar',
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
      price: 3499
    },
    {
      title: 'Zari Embroidered Designer Anarkali Suit',
      size: 'M',
      color: 'Rose Gold',
      quantity: 1,
      price: 1899
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
router.get('/invoice/sample/pdf', async (req, res, next) => {
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

router.post('/invoice/sample/pdf', async (req, res, next) => {
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

// Public PDF Invoice Download
router.get('/:orderId/invoice.pdf', async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { generateInvoicePdf } = require('../utils/invoiceGenerator');
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const pdfBuffer = await generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.get('/invoice/:orderId/pdf', async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { generateInvoicePdf } = require('../utils/invoiceGenerator');
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
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
