const Settings = require('../models/Settings');

let cachedHidden = null;
let lastHiddenFetch = 0;
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
 * Check if a specific gender/department is hidden
 */
function isDepartmentHidden(gender, hiddenList = []) {
  if (!gender || typeof gender !== 'string') return false;
  return hiddenList.includes(gender.trim().toLowerCase());
}

module.exports = {
  getHiddenDepartments,
  isDepartmentHidden
};
