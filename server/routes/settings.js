const express = require('express');
const router = express.Router();
const { getSettings, updateSetting, adminGetSettings } = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public
router.get('/', getSettings);

// Admin
router.get('/admin/all', auth, admin, adminGetSettings);
router.put('/admin/:key', auth, admin, updateSetting);

module.exports = router;
