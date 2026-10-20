const fs = require('fs');
const path = require('path');
const Banner = require('../models/Banner');
const { uploadAndProcessImage } = require('../config/cloudinary');

const sanitizeBannerImage = (bannerDoc) => {
  const b = bannerDoc.toObject ? bannerDoc.toObject() : { ...bannerDoc };
  let img = b.image;
  let needFix = false;

  if (!img || typeof img !== 'string' || !img.trim() || img === 'null' || img === 'undefined') {
    needFix = true;
  } else {
    const clean = img.trim();
    if (
      clean.includes('card.png') ||
      clean.includes('fallback-product') ||
      clean.includes('fallback-na') ||
      clean.includes('logo.png')
    ) {
      needFix = true;
    } else if (clean.startsWith('/uploads/')) {
      const localFile = path.join(__dirname, '..', clean);
      if (!fs.existsSync(localFile)) {
        needFix = true;
      }
    }
  }

  if (needFix) {
    b.image = '/fallback-banner.png';
    if (b._id) {
      Banner.findByIdAndUpdate(b._id, { image: '/fallback-banner.png' }).exec().catch(() => {});
    }
  }

  return b;
};

// @desc    Get active banners (public)
// @route   GET /api/banners
exports.getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ priority: 1 });
    const sanitized = banners.map(sanitizeBannerImage);
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all banners (admin)
// @route   GET /api/banners/admin/all
exports.adminGetBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ priority: 1 });
    const sanitized = banners.map(sanitizeBannerImage);
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
};

// @desc    Create banner (admin)
// @route   POST /api/banners/admin
exports.createBanner = async (req, res, next) => {
  try {
    const totalBanners = await Banner.countDocuments();
    if (totalBanners >= 5) {
      return res.status(400).json({
        message: 'Maximum 5 banners allowed for the carousel (Amazon/Flipkart format).'
      });
    }

    const { title, subtitle, ctaText, ctaLink, priority, isActive } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    const imageUrl = await uploadAndProcessImage(req.file.buffer, req.file.originalname, 'friends_collections/banners');

    const banner = await Banner.create({
      title: title || '',
      subtitle: subtitle || '',
      image: imageUrl,
      ctaText: ctaText || 'Shop Now',
      ctaLink: ctaLink || '/shop',
      priority: Number(priority) || (totalBanners + 1),
      isActive: isActive !== 'false' && isActive !== false
    });
    res.status(201).json(banner);
  } catch (error) {
    next(error);
  }
};

// @desc    Update banner (admin)
// @route   PUT /api/banners/admin/:id
exports.updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    const { title, subtitle, ctaText, ctaLink, priority, isActive } = req.body;

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (ctaText !== undefined) banner.ctaText = ctaText;
    if (ctaLink !== undefined) banner.ctaLink = ctaLink;
    if (priority !== undefined) banner.priority = Number(priority);
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      banner.image = await uploadAndProcessImage(req.file.buffer, req.file.originalname, 'friends_collections/banners');
    }

    await banner.save();

    // Keep Settings synced if this banner is active or priority 1
    const Settings = require('../models/Settings');
    if (banner.subtitle) {
      await Settings.findOneAndUpdate({ key: 'heroDescription' }, { value: banner.subtitle }, { upsert: true });
    }
    if (banner.title) {
      await Settings.findOneAndUpdate({ key: 'heroTitle' }, { value: banner.title }, { upsert: true });
    }

    res.json(banner);
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder banners (admin)
// @route   PUT /api/banners/admin/reorder
exports.reorderBanners = async (req, res, next) => {
  try {
    const { bannerIds } = req.body;
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ message: 'bannerIds must be an array of IDs' });
    }

    const updates = bannerIds.map((id, index) =>
      Banner.findByIdAndUpdate(id, { priority: index + 1 }, { new: true })
    );
    await Promise.all(updates);

    const updated = await Banner.find().sort({ priority: 1 });
    res.json({ message: 'Banners reordered successfully', banners: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle banner active status (admin)
// @route   PATCH /api/banners/admin/:id/toggle
exports.toggleBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();

    res.json({
      message: `Banner "${banner.title || 'Slide'}" is now ${banner.isActive ? 'ACTIVE' : 'HIDDEN'}`,
      banner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete banner (admin)
// @route   DELETE /api/banners/admin/:id
exports.deleteBanner = async (req, res, next) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
};
