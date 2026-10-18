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
      const { heroBadge, heroTitle, heroDescription } = value;
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
