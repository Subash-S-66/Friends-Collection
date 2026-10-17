const express = require('express');
const router = express.Router();
const { getBanners, adminGetBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/bannerController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');

// Public
router.get('/', getBanners);

// Admin
router.get('/admin/all', auth, admin, adminGetBanners);
router.post('/admin', auth, admin, upload.single('image'), createBanner);
router.put('/admin/:id', auth, admin, upload.single('image'), updateBanner);
router.delete('/admin/:id', auth, admin, deleteBanner);

module.exports = router;
