const express = require('express');
const router = express.Router();
const { getCategories, getCategoryTree, adminGetCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');

// Public
router.get('/', getCategories);
router.get('/tree', getCategoryTree);

// Admin
router.get('/admin/all', auth, admin, adminGetCategories);
router.post('/admin', auth, admin, upload.single('image'), createCategory);
router.put('/admin/:id', auth, admin, upload.single('image'), updateCategory);
router.delete('/admin/:id', auth, admin, deleteCategory);

module.exports = router;
