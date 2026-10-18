const express = require('express');
const router = express.Router();
const {
  getBanners,
  adminGetBanners,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');

// Auto-invalidation middleware when admin mutates banners
const flushBannerCache = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache('/api/banners');
    }
  });
  next();
};

// Public
router.get('/', cacheMiddleware(300), getBanners);

// Admin
router.get('/admin/all', auth, admin, adminGetBanners);
router.post('/admin', auth, admin, flushBannerCache, upload.single('image'), createBanner);
router.put('/admin/:id', auth, admin, flushBannerCache, upload.single('image'), updateBanner);
router.delete('/admin/:id', auth, admin, flushBannerCache, deleteBanner);

module.exports = router;
