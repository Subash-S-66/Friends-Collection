const Banner = require('../models/Banner');
const { uploadAndProcessImage } = require('../config/cloudinary');

// @desc    Get active banners (public)
// @route   GET /api/banners
exports.getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ priority: 1 });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all banners (admin)
// @route   GET /api/banners/admin/all
exports.adminGetBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ priority: 1 });
    res.json(banners);
  } catch (error) {
    next(error);
  }
};

// @desc    Create banner (admin)
// @route   POST /api/banners/admin
exports.createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, ctaText, ctaLink, priority, isActive } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    const imageUrl = await uploadAndProcessImage(req.file.buffer, req.file.originalname, 'friends_collections/banners');

    const banner = await Banner.create({
      title,
      subtitle,
      image: imageUrl,
      ctaText,
      ctaLink,
      priority: Number(priority) || 0,
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
    res.json(banner);
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
