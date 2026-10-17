const express = require('express');
const router = express.Router();
const { getProducts, getProduct, getFeatured, getRelated, adminGetProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/featured/list', getFeatured);
router.get('/:slug', getProduct);
router.get('/:slug/related', getRelated);

// Admin routes
router.get('/admin/all', auth, admin, adminGetProducts);
router.post('/admin', auth, admin, upload.array('images', 10), createProduct);
router.put('/admin/:id', auth, admin, upload.array('images', 10), updateProduct);
router.delete('/admin/:id', auth, admin, deleteProduct);

module.exports = router;
