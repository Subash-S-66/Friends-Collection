const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getSearchSuggestions,
  getFeatured,
  getHomepageBundle,
  getRelated,
  adminGetProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  toggleProductStatus,
  toggleProductCod
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
router.get('/search/suggestions', cacheMiddleware(10), getSearchSuggestions);
router.get('/:slug', cacheMiddleware(60), getProduct);
router.get('/:slug/related', cacheMiddleware(180), getRelated);

// Admin routes
router.get('/admin/all', auth, admin, adminGetProducts);
router.post('/admin', auth, admin, flushProductCache, upload.array('images', 10), createProduct);
router.put('/admin/:id', auth, admin, flushProductCache, upload.array('images', 10), updateProduct);
router.patch('/admin/:id/stock', auth, admin, flushProductCache, updateStock);
router.patch('/admin/:id/toggle', auth, admin, flushProductCache, toggleProductStatus);
router.patch('/admin/:id/toggle-cod', auth, admin, flushProductCache, toggleProductCod);
router.delete('/admin/:id', auth, admin, flushProductCache, deleteProduct);

module.exports = router;
