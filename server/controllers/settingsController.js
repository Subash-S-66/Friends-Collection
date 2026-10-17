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
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { upsert: true, new: true }
    );
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
