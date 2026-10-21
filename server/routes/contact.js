const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries } = require('../controllers/contactController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/contact
// @desc    Submit customer inquiry / request and trigger emails + preview
// @access  Public
router.post('/', submitInquiry);

// @route   GET /api/contact
// @desc    Get all inquiries for admin review
// @access  Private/Admin
router.get('/', auth, admin, getInquiries);

module.exports = router;
