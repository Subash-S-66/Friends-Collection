const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries } = require('../controllers/contactController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const { authLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/contact
// @desc    Submit customer inquiry / request and trigger emails + preview
// @access  Public
router.post('/', authLimiter, submitInquiry);

// @route   GET /api/contact
// @desc    Get all inquiries for admin review
// @access  Private/Admin
router.get('/', auth, admin, getInquiries);

module.exports = router;
