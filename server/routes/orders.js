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
