const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  previewCampaign,
  sendTestEmail,
  sendCampaignBlast,
  uploadCampaignBanner
} = require('../controllers/campaignController');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');

// All campaign routes are protected by auth and admin middleware
router.use(auth, admin);

router.get('/admin', getCampaigns);
router.post('/admin', createCampaign);
router.post('/admin/upload-banner', upload.single('banner'), uploadCampaignBanner);
router.post('/admin/preview', previewCampaign);
router.post('/admin/test', sendTestEmail);
router.post('/admin/send/:id', sendCampaignBlast);
router.get('/admin/:id', getCampaignById);
router.put('/admin/:id', updateCampaign);
router.delete('/admin/:id', deleteCampaign);

module.exports = router;
