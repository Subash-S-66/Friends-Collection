const Settings = require('../models/Settings');

// @desc    Get public settings
// @route   GET /api/settings
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find();
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    res.json(settingsObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Update setting (admin)
// @route   PUT /api/settings/admin/:key
exports.updateSetting = async (req, res, next) => {
  try {
    const { value } = req.body;
    const Banner = require('../models/Banner');

    // Support combined hero batch update
    if (req.params.key === 'heroSection' && typeof value === 'object') {
      const { heroBadge, heroTitle, heroDescription, storeVisitText } = value;
      if (heroBadge !== undefined) {
        await Settings.findOneAndUpdate({ key: 'heroBadge' }, { value: heroBadge }, { upsert: true });
      }
      if (heroTitle !== undefined) {
        await Settings.findOneAndUpdate({ key: 'heroTitle' }, { value: heroTitle }, { upsert: true });
        await Banner.updateMany({ priority: 1 }, { title: heroTitle });
      }
      if (heroDescription !== undefined) {
        await Settings.findOneAndUpdate({ key: 'heroDescription' }, { value: heroDescription }, { upsert: true });
        await Banner.updateMany({ priority: 1 }, { subtitle: heroDescription });
      }
      if (storeVisitText !== undefined) {
        await Settings.findOneAndUpdate({ key: 'storeVisitText' }, { value: storeVisitText }, { upsert: true });
      }
      return res.json({ message: 'Hero section updated successfully' });
    }

    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { upsert: true, new: true }
    );

    // Sync Banner subtitle if heroDescription is updated directly
    if (req.params.key === 'heroDescription' && typeof value === 'string') {
      await Banner.updateMany({ priority: 1 }, { subtitle: value.trim() });
    }
    // Sync Banner title if heroTitle is updated directly
    if (req.params.key === 'heroTitle' && typeof value === 'string') {
      await Banner.updateMany({ priority: 1 }, { title: value.trim() });
    }

    // Sync categories & products if hiddenDepartments is updated directly
    if (req.params.key === 'hiddenDepartments' && Array.isArray(value)) {
      const Category = require('../models/Category');
      const Product = require('../models/Product');
      const hiddenList = value.map((x) => String(x).toLowerCase().trim());
      const allDepts = ['women', 'men', 'kids'];

      for (const dept of allDepts) {
        const isHidden = hiddenList.includes(dept);
        const newIsActive = !isHidden;

        const baseCatFilter =
          dept === 'women'
            ? { $or: [{ gender: 'women' }, { gender: null }, { gender: { $exists: false } }] }
            : { gender: dept };

        const directCats = await Category.find(baseCatFilter).select('_id').lean();
        const allCatIds = new Set(directCats.map((c) => c._id.toString()));

        let currentLevelIds = Array.from(allCatIds);
        while (currentLevelIds.length > 0) {
          const childCats = await Category.find({ parent: { $in: currentLevelIds } }).select('_id').lean();
          const nextLevelIds = childCats
            .map((c) => c._id.toString())
            .filter((id) => !allCatIds.has(id));
          nextLevelIds.forEach((id) => allCatIds.add(id));
          currentLevelIds = nextLevelIds;
        }

        const catIdArray = Array.from(allCatIds);
        await Category.updateMany(
          { $or: [baseCatFilter, ...(catIdArray.length > 0 ? [{ _id: { $in: catIdArray } }] : [])] },
          { isActive: newIsActive }
        );

        await Product.updateMany(
          {
            $or: [
              { gender: dept },
              ...(catIdArray.length > 0 ? [{ category: { $in: catIdArray } }] : []),
              ...(catIdArray.length > 0 ? [{ subcategory: { $in: catIdArray } }] : [])
            ]
          },
          { isActive: newIsActive }
        );
      }
    }

    res.json(setting);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all settings (admin)
// @route   GET /api/settings/admin/all
exports.adminGetSettings = async (req, res, next) => {
  try {
    const settings = await Settings.find();
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    res.json(settingsObj);
  } catch (error) {
    next(error);
  }
};

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(2, local.length - 4))}${local.slice(-2)}@${domain}`;
};

// @desc    Send OTP to admin email for authorized signature modification
// @route   POST /api/settings/admin/signature-otp
exports.requestSignatureOtp = async (req, res, next) => {
  try {
    const VerificationToken = require('../models/VerificationToken');
    const { sendSignatureChangeOtpEmail } = require('../utils/emailService');

    const adminEmail = (req.user?.email || process.env.ADMIN_EMAIL || 'friends.collection06@gmail.com').trim().toLowerCase();
    const adminName = req.user?.name || 'Administrator';

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any previous active signature-change tokens
    await VerificationToken.deleteMany({ email: adminEmail, type: 'signature-change' });

    await VerificationToken.create({
      email: adminEmail,
      token: otp,
      type: 'signature-change',
      expiresAt
    });

    try {
      await sendSignatureChangeOtpEmail({
        to: adminEmail,
        token: otp,
        name: adminName
      });
    } catch (mailError) {
      console.error('Mail dispatch error during signature OTP request:', mailError.message);
      return res.status(502).json({
        isMailError: true,
        message: `Could not send verification OTP to ${adminEmail} due to a mail service issue. Please try again in a few moments.`
      });
    }

    res.json({
      success: true,
      message: `A 6-digit signature authorization code has been sent to ${maskEmail(adminEmail)}.`,
      maskedEmail: maskEmail(adminEmail)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and save new signature image (or remove it)
// @route   POST /api/settings/admin/signature-verify
exports.verifyAndSaveSignature = async (req, res, next) => {
  try {
    const VerificationToken = require('../models/VerificationToken');
    const { uploadSignatureImage } = require('../config/cloudinary');
    const { invalidateCache } = require('../utils/cache');

    const adminEmail = (req.user?.email || process.env.ADMIN_EMAIL || 'friends.collection06@gmail.com').trim().toLowerCase();
    const { otp, action } = req.body;

    if (!otp || !otp.trim()) {
      return res.status(400).json({ message: 'Please enter the 6-digit verification OTP sent to your email.' });
    }

    const cleanOtp = otp.trim();

    // Verify token
    const tokenRecord = await VerificationToken.findOne({
      email: adminEmail,
      token: cleanOtp,
      type: 'signature-change',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenRecord) {
      return res.status(400).json({
        message: 'Invalid or expired OTP code. Please verify the 6 digits or request a fresh OTP.'
      });
    }

    // Mark token used
    tokenRecord.used = true;
    await tokenRecord.save();

    let newSignatureUrl = '';

    if (action === 'remove' || req.body.remove === 'true') {
      newSignatureUrl = '';
    } else if (req.file && req.file.buffer) {
      newSignatureUrl = await uploadSignatureImage(req.file.buffer, req.file.originalname);
    } else if (req.body.signatureImage) {
      newSignatureUrl = req.body.signatureImage;
    } else {
      return res.status(400).json({ message: 'No signature image file or action provided.' });
    }

    // Fetch existing invoice settings and update signatureImage
    const existingDoc = await Settings.findOne({ key: 'invoiceSettings' });
    const currentInvoiceSettings = existingDoc && typeof existingDoc.value === 'object' ? existingDoc.value : {};

    const updatedInvoiceSettings = {
      ...currentInvoiceSettings,
      signatureImage: newSignatureUrl,
      signatureUpdatedAt: new Date().toISOString()
    };

    await Settings.findOneAndUpdate(
      { key: 'invoiceSettings' },
      { value: updatedInvoiceSettings },
      { upsert: true, new: true }
    );

    invalidateCache('/api/settings');

    res.json({
      success: true,
      signatureImage: newSignatureUrl,
      message: action === 'remove'
        ? 'Authorized signature successfully removed from invoices.'
        : 'Authorized signature image verified and updated successfully!'
    });
  } catch (error) {
    next(error);
  }
};
