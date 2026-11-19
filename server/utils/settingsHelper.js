const Settings = require('../models/Settings');

let cachedHidden = null;
let lastHiddenFetch = 0;
let cachedExcludedCatIds = null;
let lastExcludedCatFetch = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Retrieve the array of currently hidden departments/genders.
 * e.g. ['kids'] or ['men', 'kids']
 * Defaults to [] (all departments visible)
 */
async function getHiddenDepartments() {
  const now = Date.now();
  if (cachedHidden && now - lastHiddenFetch < CACHE_TTL_MS) {
    return cachedHidden;
  }

  try {
    const setting = await Settings.findOne({ key: 'hiddenDepartments' }).lean();
    if (setting && Array.isArray(setting.value)) {
      cachedHidden = setting.value
        .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
        .filter(Boolean);
    } else {
      cachedHidden = [];
    }
    lastHiddenFetch = now;
    return cachedHidden;
  } catch (err) {
    console.error('Error fetching hiddenDepartments setting:', err);
  }
  return cachedHidden || [];
}

/**
 * Fast cached retriever for inactive and hidden category IDs
 * Prevents multiple sequential Category database queries on every product request
 */
async function getExcludedCategoryIds() {
  const now = Date.now();
  if (cachedExcludedCatIds && now - lastExcludedCatFetch < CACHE_TTL_MS) {
    return cachedExcludedCatIds;
  }

  try {
    const Category = require('../models/Category');
    const hiddenDepartments = await getHiddenDepartments();

    const excludedCats = await Category.find({
      $or: [
        { isActive: false },
        ...(hiddenDepartments.length > 0 ? [{ gender: { $in: hiddenDepartments } }] : [])
      ]
    }).select('_id parent isActive').lean();

    const excludedCatIds = excludedCats.map((c) => c._id.toString());
    const inactiveParentIds = excludedCats.filter((c) => !c.parent).map((c) => c._id);
    if (inactiveParentIds.length > 0) {
      const childSubs = await Category.find({ parent: { $in: inactiveParentIds } }).select('_id').lean();
      childSubs.forEach((s) => excludedCatIds.push(s._id.toString()));
    }

    cachedExcludedCatIds = excludedCatIds;
    lastExcludedCatFetch = now;
    return cachedExcludedCatIds;
  } catch (err) {
    console.error('Error fetching excluded category IDs:', err);
  }
  return cachedExcludedCatIds || [];
}

function flushCategoryHelperCache() {
  cachedExcludedCatIds = null;
  lastExcludedCatFetch = 0;
  cachedHidden = null;
  lastHiddenFetch = 0;
}

/**
 * Check if a specific gender/department is hidden
 */
function isDepartmentHidden(gender, hiddenList = []) {
  if (!gender || typeof gender !== 'string') return false;
  return hiddenList.includes(gender.trim().toLowerCase());
}

module.exports = {
  getHiddenDepartments,
  getExcludedCategoryIds,
  flushCategoryHelperCache,
  isDepartmentHidden
};
