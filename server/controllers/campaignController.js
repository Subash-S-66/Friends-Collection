const Campaign = require('../models/Campaign');
const User = require('../models/User');
const NotificationSubscription = require('../models/NotificationSubscription');
const { sendCampaignEmail, renderCampaignHtml } = require('../utils/emailService');
const { uploadAndProcessImage } = require('../config/cloudinary');

// @desc    Upload campaign banner image
// @route   POST /api/campaigns/admin/upload-banner
exports.uploadCampaignBanner = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    const imageUrl = await uploadAndProcessImage(
      req.file.buffer,
      req.file.originalname,
      'friends_collections/campaigns'
    );
    res.json({ imageUrl });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all campaigns (admin)
// @route   GET /api/campaigns/admin
exports.getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find()
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
};

// @desc    Get campaign by ID (admin)
// @route   GET /api/campaigns/admin/:id
exports.getCampaignById = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new campaign (admin)
// @route   POST /api/campaigns/admin
exports.createCampaign = async (req, res, next) => {
  try {
    const {
      title,
      subject,
      preheader,
      badgeText,
      headline,
      bannerImage,
      bodyHtml,
      ctaText,
      ctaUrl,
      couponCode,
      targetAudience
    } = req.body;

    if (!title || !subject || !bodyHtml) {
      return res.status(400).json({ message: 'Campaign Title, Subject, and Content are required' });
    }

    const campaign = await Campaign.create({
      title,
      subject,
      preheader: preheader || subject,
      badgeText: badgeText || 'FESTIVE SPECIAL OFFER',
      headline: headline || '',
      bannerImage: bannerImage || '',
      bodyHtml,
      ctaText: ctaText || 'Explore Festive Collection',
      ctaUrl: ctaUrl || 'https://friends-collection.vercel.app/shop',
      couponCode: couponCode || '',
      targetAudience: targetAudience || 'all',
      status: 'draft',
      sentBy: req.user._id
    });

    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
};

// @desc    Update campaign (admin)
// @route   PUT /api/campaigns/admin/:id
exports.updateCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const fields = [
      'title', 'subject', 'preheader', 'badgeText', 'headline',
      'bannerImage', 'bodyHtml', 'ctaText', 'ctaUrl', 'couponCode', 'targetAudience'
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) campaign[f] = req.body[f];
    });

    await campaign.save();
    res.json(campaign);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete campaign (admin)
// @route   DELETE /api/campaigns/admin/:id
exports.deleteCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Live render preview HTML
// @route   POST /api/campaigns/admin/preview
exports.previewCampaign = (req, res) => {
  try {
    const html = renderCampaignHtml(req.body, 'Valued Customer');
    res.json({ html });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send test email to admin / specific email
// @route   POST /api/campaigns/admin/test
exports.sendTestEmail = async (req, res, next) => {
  try {
    const { testEmail, campaign } = req.body;
    if (!testEmail || !/\S+@\S+\.\S+/.test(testEmail)) {
      return res.status(400).json({ message: 'Valid test email address is required' });
    }

    const result = await sendCampaignEmail({
      to: testEmail.trim().toLowerCase(),
      name: 'Admin Test',
      campaign
    });

    if (!result.success) {
      return res.status(500).json({ message: result.error || 'Failed to dispatch test email' });
    }

    res.json({
      message: `Test email successfully dispatched to ${testEmail}!`,
      messageId: result.messageId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send campaign blast to targeted recipients
// @route   POST /api/campaigns/admin/send/:id
exports.sendCampaignBlast = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Gather recipients
    const emailMap = new Map();

    // 1. Registered Customers
    if (campaign.targetAudience === 'all' || campaign.targetAudience === 'customers') {
      const users = await User.find({}, 'email name');
      users.forEach((u) => {
        if (u.email && /\S+@\S+\.\S+/.test(u.email)) {
          emailMap.set(u.email.toLowerCase(), u.name || 'Valued Customer');
        }
      });
    }

    // 2. Waitlist Subscribers
    if (campaign.targetAudience === 'all' || campaign.targetAudience === 'waitlist') {
      const subs = await NotificationSubscription.find({}, 'email');
      subs.forEach((s) => {
        if (s.email && /\S+@\S+\.\S+/.test(s.email) && !emailMap.has(s.email.toLowerCase())) {
          emailMap.set(s.email.toLowerCase(), 'Valued Customer');
        }
      });
    }

    // Always include admin email so admin sees their own blast
    const adminEmail = process.env.ADMIN_EMAIL || 'friends.collection06@gmail.com';
    if (!emailMap.has(adminEmail.toLowerCase())) {
      emailMap.set(adminEmail.toLowerCase(), 'Friends Collections Admin');
    }

    const recipients = Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found for this target audience' });
    }

    let sentSuccess = 0;
    // Dispatch in batches of 5 to avoid overwhelming SMTP
    for (const recipient of recipients) {
      try {
        const result = await sendCampaignEmail({
          to: recipient.email,
          name: recipient.name,
          campaign
        });
        if (result.success) sentSuccess++;
      } catch (err) {
        console.error(`Blast error for ${recipient.email}:`, err.message);
      }
    }

    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.recipientCount = sentSuccess;
    await campaign.save();

    res.json({
      message: `🎉 Campaign successfully delivered to ${sentSuccess} customer inboxes!`,
      recipientCount: sentSuccess,
      campaign
    });
  } catch (error) {
    next(error);
  }
};
