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
