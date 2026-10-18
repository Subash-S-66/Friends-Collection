const Category = require('../models/Category');
const slugify = require('slugify');
const { uploadAndProcessImage } = require('../config/cloudinary');

// @desc    Get active categories with parent info (public)
// @route   GET /api/categories
exports.getCategories = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.gender && req.query.gender !== 'all') {
      filter.$or = [{ gender: req.query.gender }, { gender: 'all' }];
    }
    const categories = await Category.find(filter)
      .populate('parent', 'name slug gender')
      .sort({ priority: 1, createdAt: -1 })
      .lean();
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

// @desc    Get hierarchical category tree (Top categories with nested subcategories)
// @route   GET /api/categories/tree
exports.getCategoryTree = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.gender && req.query.gender !== 'all') {
      filter.$or = [{ gender: req.query.gender }, { gender: 'all' }];
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
    if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true;
    
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

    const populated = await Category.findById(category._id).populate('parent', 'name slug gender');
    res.json({
      message: `Category is now ${category.isActive ? 'visible' : 'hidden'} on storefront`,
      category: populated
    });
  } catch (error) {
    next(error);
  }
};
