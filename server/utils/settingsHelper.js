const Settings = require('../models/Settings');

/**
 * Retrieve the array of currently hidden departments/genders.
 * e.g. ['kids'] or ['men', 'kids']
 * Defaults to [] (all departments visible)
 */
async function getHiddenDepartments() {
  try {
    const setting = await Settings.findOne({ key: 'hiddenDepartments' }).lean();
    if (setting && Array.isArray(setting.value)) {
      return setting.value
        .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
        .filter(Boolean);
    }
  } catch (err) {
    console.error('Error fetching hiddenDepartments setting:', err);
  }
  return [];
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
