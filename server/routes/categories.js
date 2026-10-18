const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryTree,
  adminGetCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus
} = require('../controllers/categoryController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');

// Auto-invalidation middleware when admin mutates categories
const flushCategoryCache = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache('/api/categories');
    }
  });
  next();
};

// Public routes with fast in-memory caching
router.get('/', cacheMiddleware(180), getCategories);
router.get('/tree', cacheMiddleware(180), getCategoryTree);

// Admin routes
router.get('/admin/all', auth, admin, adminGetCategories);
router.post('/admin', auth, admin, flushCategoryCache, upload.single('image'), createCategory);
router.put('/admin/:id', auth, admin, flushCategoryCache, upload.single('image'), updateCategory);
router.patch('/admin/:id/toggle', auth, admin, flushCategoryCache, toggleCategoryStatus);
router.delete('/admin/:id', auth, admin, flushCategoryCache, deleteCategory);

module.exports = router;
