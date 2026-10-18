const express = require('express');
const router = express.Router();
const {
  subscribeBackInStock,
  checkSubscription,
  notifySubscribers,
  adminGetSubscriptions
} = require('../controllers/notificationController');
const { auth, optionalAuth } = require('../middleware/auth');
const admin = require('../middleware/admin');

// Customer endpoints
router.post('/subscribe', optionalAuth, subscribeBackInStock);
router.get('/status', optionalAuth, checkSubscription);

// Admin endpoints
router.post('/admin/notify/:productId', auth, admin, notifySubscribers);
router.get('/admin/all', auth, admin, adminGetSubscriptions);

module.exports = router;
