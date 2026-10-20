const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSetting,
  adminGetSettings
} = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');

// Auto-invalidation middleware when admin updates settings
const flushSettingsCache = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache('/api/settings');
      invalidateCache('/api/products/homepage-bundle');
      invalidateCache('/api/categories');
      invalidateCache('/api/products');
    }
  });
  next();
};

// Public
router.get('/', cacheMiddleware(300), getSettings);

// Admin
router.get('/admin/all', auth, admin, adminGetSettings);
router.put('/admin/:key', auth, admin, flushSettingsCache, updateSetting);

module.exports = router;
