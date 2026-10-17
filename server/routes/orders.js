const express = require('express');
const router = express.Router();
const { placeOrder, getMyOrders, trackOrder, adminGetOrders, adminGetOrder, updateOrderStatus, getOrderStats } = require('../controllers/orderController');
const { auth, optionalAuth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const { orderLimiter } = require('../middleware/rateLimiter');

// Public / Guest
router.post('/', orderLimiter, optionalAuth, placeOrder);
router.get('/track/:orderId', trackOrder);

// Logged-in user
router.get('/my', auth, getMyOrders);

// Admin
router.get('/admin/stats', auth, admin, getOrderStats);
router.get('/admin/all', auth, admin, adminGetOrders);
router.get('/admin/:id', auth, admin, adminGetOrder);
router.put('/admin/:id/status', auth, admin, updateOrderStatus);

module.exports = router;
