const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getFeatured,
  getHomepageBundle,
  getRelated,
  adminGetProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock
} = require('../controllers/productController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');

// Auto-invalidation middleware when admin mutates products
const flushProductCache = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache('/api/products');
    }
  });
  next();
};

// Public routes with fast in-memory caching (<1ms response times)
router.get('/', cacheMiddleware(60), getProducts);
router.get('/featured/list', cacheMiddleware(180), getFeatured);
router.get('/homepage-bundle', cacheMiddleware(180), getHomepageBundle);
router.get('/:slug', cacheMiddleware(60), getProduct);
router.get('/:slug/related', cacheMiddleware(180), getRelated);

// Admin routes
router.get('/admin/all', auth, admin, adminGetProducts);
router.post('/admin', auth, admin, flushProductCache, upload.array('images', 10), createProduct);
router.put('/admin/:id', auth, admin, flushProductCache, upload.array('images', 10), updateProduct);
router.patch('/admin/:id/stock', auth, admin, flushProductCache, updateStock);
router.delete('/admin/:id', auth, admin, flushProductCache, deleteProduct);

module.exports = router;
