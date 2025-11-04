const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get all categories (with tree structure)
 * @route   GET /api/admin/categories
 * @access  Private/Admin
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await db('categories')
      .select('*')
      .orderBy('display_order', 'asc');

    // Build tree structure
    const categoryMap = {};
    const tree = [];

    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, subcategories: [] };
    });

    categories.forEach(cat => {
      if (cat.parent_id) {
        if (categoryMap[cat.parent_id]) {
          categoryMap[cat.parent_id].subcategories.push(categoryMap[cat.id]);
        }
      } else {
        tree.push(categoryMap[cat.id]);
      }
    });

    successResponse(res, { categories: tree }, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category by ID
 * @route   GET /api/admin/categories/:id
 * @access  Private/Admin
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await db('categories').where('id', id).first();
    if (!category) throw new AppError('Category not found', 404);

    const [{ products_count }] = await db('product_categories')
      .where('category_id', id)
      .count('* as products_count');

    successResponse(res, {
      category: { ...category, products_count: parseInt(products_count) || 0 }
    }, 'Category retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 * @access  Private/Admin
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, parent_id, icon, image_url, is_active } = req.body;

    const [categoryId] = await db('categories').insert({
      name,
      slug,
      description,
      parent_id,
      icon,
      image_url,
      is_active: is_active !== undefined ? is_active : true,
      created_at: db.fn.now()
    });

    const category = await db('categories').where('id', categoryId).first();
    successResponse(res, { category }, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await db('categories').where('id', id).first();
    if (!category) throw new AppError('Category not found', 404);

    await db('categories')
      .where('id', id)
      .update({ ...req.body, updated_at: db.fn.now() });

    const updated = await db('categories').where('id', id).first();
    successResponse(res, { category: updated }, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await db('categories').where('id', id).first();
    if (!category) throw new AppError('Category not found', 404);

    // Check if category has products
    const [{ products_count }] = await db('product_categories')
      .where('category_id', id)
      .count('* as products_count');

    if (products_count > 0) {
      throw new AppError('Cannot delete category with products', 400);
    }

    // Check if category has subcategories
    const [{ subcategories_count }] = await db('categories')
      .where('parent_id', id)
      .count('* as subcategories_count');

    if (subcategories_count > 0) {
      throw new AppError('Cannot delete category with subcategories', 400);
    }

    await db('categories').where('id', id).delete();
    successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle category status
 * @route   PATCH /api/admin/categories/:id/toggle-status
 * @access  Private/Admin
 */
exports.toggleCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await db('categories').where('id', id).first();
    if (!category) throw new AppError('Category not found', 404);

    const newStatus = !category.is_active;
    await db('categories')
      .where('id', id)
      .update({ is_active: newStatus, updated_at: db.fn.now() });

    const updated = await db('categories').where('id', id).first();
    successResponse(res, { category: updated }, 'Category status updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder categories
 * @route   POST /api/admin/categories/reorder
 * @access  Private/Admin
 */
exports.reorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body; // Array of { id, display_order }

    await db.transaction(async (trx) => {
      for (const cat of categories) {
        await trx('categories')
          .where('id', cat.id)
          .update({ display_order: cat.display_order });
      }
    });

    successResponse(res, null, 'Categories reordered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get categories statistics
 * @route   GET /api/admin/categories/stats
 * @access  Private/Admin
 */
exports.getCategoriesStats = async (req, res, next) => {
  try {
    const [{ total_categories }] = await db('categories').count('* as total_categories');
    const [{ active_categories }] = await db('categories').where('is_active', true).count('* as active_categories');
    const [{ root_categories }] = await db('categories').whereNull('parent_id').count('* as root_categories');

    // Categories with most products
    const topCategories = await db('categories as c')
      .leftJoin('product_categories as pc', 'c.id', 'pc.category_id')
      .select('c.id', 'c.name')
      .count('pc.product_id as products_count')
      .groupBy('c.id')
      .orderBy('products_count', 'desc')
      .limit(5);

    successResponse(res, {
      total_categories: parseInt(total_categories) || 0,
      active_categories: parseInt(active_categories) || 0,
      root_categories: parseInt(root_categories) || 0,
      top_categories: topCategories
    }, 'Categories statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get root categories
 * @route   GET /api/admin/categories/root
 * @access  Private/Admin
 */
exports.getRootCategories = async (req, res, next) => {
  try {
    const categories = await db('categories')
      .whereNull('parent_id')
      .orderBy('display_order', 'asc')
      .select('*');

    successResponse(res, { categories }, 'Root categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subcategories
 * @route   GET /api/admin/categories/:id/subcategories
 * @access  Private/Admin
 */
exports.getSubcategories = async (req, res, next) => {
  try {
    const { id } = req.params;

    const parent = await db('categories').where('id', id).first();
    if (!parent) throw new AppError('Parent category not found', 404);

    const subcategories = await db('categories')
      .where('parent_id', id)
      .orderBy('display_order', 'asc')
      .select('*');

    successResponse(res, { subcategories }, 'Subcategories retrieved successfully');
  } catch (error) {
    next(error);
  }
};
