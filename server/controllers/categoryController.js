const Category = require('../models/Category');
const slugify = require('slugify');
const { uploadAndProcessImage } = require('../config/cloudinary');
const { getHiddenDepartments } = require('../utils/settingsHelper');

// @desc    Get active categories with parent info (public)
// @route   GET /api/categories
exports.getCategories = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const filter = { isActive: true };

    if (req.query.gender && req.query.gender !== 'all') {
      const qGender = req.query.gender.toLowerCase();
      if (hiddenDepartments.includes(qGender)) {
        return res.json([]);
      }
      filter.$or = [{ gender: qGender }, { gender: 'all' }];
    } else if (hiddenDepartments.length > 0) {
      filter.gender = { $nin: hiddenDepartments };
    }

    const categories = await Category.find(filter)
      .populate('parent', 'name slug gender isActive')
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    // Filter out any subcategory whose parent is inactive or in a hidden department
    const activeCategories = categories.filter((c) => {
      if (c.parent) {
        if (c.parent.isActive === false) return false;
        if (c.parent.gender && hiddenDepartments.includes(c.parent.gender.toLowerCase())) return false;
      }
      return true;
    });

    res.json(activeCategories);
  } catch (error) {
    next(error);
  }
};

// @desc    Get hierarchical category tree (Top categories with nested subcategories)
// @route   GET /api/categories/tree
exports.getCategoryTree = async (req, res, next) => {
  try {
    const hiddenDepartments = await getHiddenDepartments();
    const filter = { isActive: true };

    if (req.query.gender && req.query.gender !== 'all') {
      const qGender = req.query.gender.toLowerCase();
      if (hiddenDepartments.includes(qGender)) {
        return res.json([]);
      }
      filter.$or = [{ gender: qGender }, { gender: 'all' }];
    } else if (hiddenDepartments.length > 0) {
      filter.gender = { $nin: hiddenDepartments };
    }

    const allActive = await Category.find(filter)
      .sort({ priority: 1, createdAt: 1 })
      .lean();

    const parentCategories = allActive.filter((c) => !c.parent);
    const tree = parentCategories.map((parent) => {
      const subcategories = allActive.filter(
        (c) => c.parent && c.parent.toString() === parent._id.toString()
      );
      return {
        ...parent,
        subcategories
      };
    });

    res.json(tree);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories with parent info (admin)
// @route   GET /api/categories/admin/all
exports.adminGetCategories = async (req, res, next) => {
  try {
    const categories = await Category.find()
      .populate('parent', 'name slug')
      .sort({ priority: 1, createdAt: -1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// @desc    Create category or subcategory (admin)
// @route   POST /api/categories/admin
exports.createCategory = async (req, res, next) => {
  try {
    const { name, parent, gender, description, priority, isActive } = req.body;
    let baseSlug = slugify(name, { lower: true, strict: true });
    
    // If parent is provided, prefix or check uniqueness
    let parentDoc = null;
    let determinedGender = gender || 'women';
    if (parent && parent !== 'null' && parent !== '') {
      parentDoc = await Category.findById(parent);
      if (parentDoc) {
        if (!gender && parentDoc.gender) {
          determinedGender = parentDoc.gender;
        }
        // Check if slug collision exists
        const existingSlug = await Category.findOne({ slug: baseSlug });
        if (existingSlug) {
          baseSlug = `${parentDoc.slug}-${baseSlug}`;
        }
      }
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = await uploadAndProcessImage(req.file.buffer, req.file.originalname, 'friends_collections/categories');
    }

    const category = await Category.create({
      name,
      slug: baseSlug,
      parent: parentDoc ? parentDoc._id : null,
      gender: determinedGender,
      image: imageUrl,
      description: description || '',
      priority: Number(priority) || 0,
      isActive: isActive !== false && isActive !== 'false'
    });

    const populated = await Category.findById(category._id).populate('parent', 'name slug gender');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update category (admin)
// @route   PUT /api/categories/admin/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { name, parent, gender, description, priority, isActive } = req.body;

    if (name) {
      category.name = name;
      let newSlug = slugify(name, { lower: true, strict: true });
      if (parent && parent !== 'null' && parent !== '') {
        const parentDoc = await Category.findById(parent);
        if (parentDoc) {
          const existingSlug = await Category.findOne({ slug: newSlug, _id: { $ne: category._id } });
          if (existingSlug) newSlug = `${parentDoc.slug}-${newSlug}`;
        }
      }
      category.slug = newSlug;
    }

    if (parent !== undefined) {
      category.parent = parent && parent !== 'null' && parent !== '' ? parent : null;
    }
    if (gender !== undefined) category.gender = gender;
    if (description !== undefined) category.description = description;
    if (priority !== undefined) category.priority = Number(priority);
    if (isActive !== undefined) {
      const nextActive = isActive === 'true' || isActive === true;
      category.isActive = nextActive;
      // If this is a main category, cascade active status to all child subcategories
      if (!category.parent) {
        await Category.updateMany(
          { parent: category._id },
          { isActive: nextActive }
        );
      }
    }
    
    if (req.file) {
      category.image = await uploadAndProcessImage(req.file.buffer, req.file.originalname, 'friends_collections/categories');
    }

    await category.save();
    const populated = await Category.findById(category._id).populate('parent', 'name slug gender');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category and unparent / delete subcategories (admin)
// @route   DELETE /api/categories/admin/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    // Delete any subcategories under this parent or unparent them
    await Category.deleteMany({ parent: categoryId });
    await Category.findByIdAndDelete(categoryId);
    res.json({ message: 'Category and nested subcategories deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle category active visibility (admin)
// @route   PATCH /api/categories/admin/:id/toggle
exports.toggleCategoryStatus = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.isActive = !category.isActive;
    await category.save();

    let cascadeCount = 0;
    // If this is a main category, cascade to all child subcategories!
    if (!category.parent) {
      const cascadeResult = await Category.updateMany(
        { parent: category._id },
        { isActive: category.isActive }
      );
      cascadeCount = cascadeResult.modifiedCount || 0;
    }

    const populated = await Category.findById(category._id).populate('parent', 'name slug gender');
    res.json({
      message: `Category "${category.name}" is now ${category.isActive ? 'visible' : 'hidden'} on storefront${
        cascadeCount > 0 ? ` (along with ${cascadeCount} sub-categories)` : ''
      }`,
      category: populated,
      cascadeCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle or set entire department active status (all categories + products + hiddenDepartments setting)
// @route   PATCH /api/categories/admin/department/:gender/toggle
exports.toggleEntireDepartment = async (req, res, next) => {
  try {
    const { gender } = req.params;
    const g = (gender || '').trim().toLowerCase();
    if (!['women', 'men', 'kids'].includes(g)) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    const Settings = require('../models/Settings');
    const Product = require('../models/Product');
    const settingsDoc = await Settings.findOne({ key: 'hiddenDepartments' });
    let hidden = Array.isArray(settingsDoc?.value) ? settingsDoc.value.map((x) => String(x).toLowerCase()) : [];

    // Optional explicit status override in body: { isActive: boolean }
    let newIsActive;
    if (typeof req.body?.isActive === 'boolean') {
      newIsActive = req.body.isActive;
    } else {
      // Toggle based on whether currently in hiddenDepartments
      const isCurrentlyHidden = hidden.includes(g);
      newIsActive = isCurrentlyHidden; // If hidden, make active (true); if active, make hidden (false)
    }

    const newHiddenState = !newIsActive;

    // Safety guard: at least one department must remain visible
    if (newHiddenState) {
      const allDepts = ['women', 'men', 'kids'];
      const activeDepts = allDepts.filter((k) => !hidden.includes(k));
      if (activeDepts.length <= 1 && activeDepts.includes(g)) {
        return res.status(400).json({ message: 'At least one department must remain visible on the store.' });
      }
      if (!hidden.includes(g)) {
        hidden.push(g);
      }
    } else {
      hidden = hidden.filter((k) => k !== g);
    }

    // 1. Update Settings hiddenDepartments
    await Settings.findOneAndUpdate(
      { key: 'hiddenDepartments' },
      { value: hidden },
      { upsert: true, new: true }
    );

    // 2. Find ALL categories and subcategories belonging to this department
    const baseCatFilter =
      g === 'women'
        ? { $or: [{ gender: 'women' }, { gender: null }, { gender: { $exists: false } }] }
        : { gender: g };

    const directCats = await Category.find(baseCatFilter).select('_id').lean();
    const allCatIds = new Set(directCats.map((c) => c._id.toString()));

    // Recursively collect all descendant subcategories so EVERYTHING turns on/off together
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

    const fullCatFilter = {
      $or: [
        baseCatFilter,
        ...(catIdArray.length > 0 ? [{ _id: { $in: catIdArray } }] : [])
      ]
    };

    // Reactivate or deactivate ALL categories and nested subcategories
    const updateResult = await Category.updateMany(fullCatFilter, { isActive: newIsActive });

    // 3. Also sync all products belonging to this department / category taxonomy
    const productFilter = {
      $or: [
        { gender: g },
        ...(catIdArray.length > 0 ? [{ category: { $in: catIdArray } }] : []),
        ...(catIdArray.length > 0 ? [{ subcategory: { $in: catIdArray } }] : [])
      ]
    };
    const prodResult = await Product.updateMany(productFilter, { isActive: newIsActive });

    const names = { women: "Women's Studio", men: "Men's Studio", kids: "Kids' Studio" };
    const deptName = names[g] || g;

    res.json({
      success: true,
      department: g,
      isHidden: newHiddenState,
      isActive: newIsActive,
      hiddenDepartments: hidden,
      categoriesUpdated: updateResult.modifiedCount || 0,
      productsUpdated: prodResult.modifiedCount || 0,
      message: newHiddenState
        ? `Entire ${deptName} (${updateResult.modifiedCount || 0} categories) is now turned OFF and hidden from store & navbar.`
        : `Entire ${deptName} (${updateResult.modifiedCount || 0} categories) is now turned ON and LIVE on store & navbar.`
    });
  } catch (error) {
    next(error);
  }
};
