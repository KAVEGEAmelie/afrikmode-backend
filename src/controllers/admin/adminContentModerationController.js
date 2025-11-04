const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get flagged products
 * @route   GET /api/admin/content-moderation/products
 * @access  Private/Admin
 */
exports.getFlaggedProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('content_flags as cf')
      .join('products as p', 'cf.flaggable_id', 'p.id')
      .join('users as reporter', 'cf.reported_by', 'reporter.id')
      .leftJoin('vendors as v', 'p.vendor_id', 'v.id')
      .where('cf.flaggable_type', 'product')
      .select(
        'cf.id as flag_id',
        'cf.reason',
        'cf.description',
        'cf.status',
        'cf.created_at',
        'p.id as product_id',
        'p.name as product_name',
        'p.image_url',
        'p.price',
        'v.id as vendor_id',
        'v.business_name',
        'reporter.first_name as reporter_first_name',
        'reporter.last_name as reporter_last_name'
      );

    if (status) query = query.where('cf.status', status);

    const [{ count: total }] = await query.clone().count('cf.id as count');
    const flaggedProducts = await query
      .orderBy('cf.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      flagged_products: flaggedProducts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Flagged products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get flagged reviews
 * @route   GET /api/admin/content-moderation/reviews
 * @access  Private/Admin
 */
exports.getFlaggedReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('content_flags as cf')
      .join('reviews as r', 'cf.flaggable_id', 'r.id')
      .join('users as author', 'r.user_id', 'author.id')
      .join('products as p', 'r.product_id', 'p.id')
      .join('users as reporter', 'cf.reported_by', 'reporter.id')
      .where('cf.flaggable_type', 'review')
      .select(
        'cf.id as flag_id',
        'cf.reason',
        'cf.description',
        'cf.status',
        'cf.created_at',
        'r.id as review_id',
        'r.rating',
        'r.comment',
        'p.id as product_id',
        'p.name as product_name',
        'author.first_name as author_first_name',
        'author.last_name as author_last_name',
        'reporter.first_name as reporter_first_name',
        'reporter.last_name as reporter_last_name'
      );

    if (status) query = query.where('cf.status', status);

    const [{ count: total }] = await query.clone().count('cf.id as count');
    const flaggedReviews = await query
      .orderBy('cf.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      flagged_reviews: flaggedReviews,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Flagged reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve flagged product
 * @route   POST /api/admin/content-moderation/products/:id/approve
 * @access  Private/Admin
 */
exports.approveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const flag = await db('content_flags')
      .where('id', id)
      .where('flaggable_type', 'product')
      .first();

    if (!flag) throw new AppError('Flagged product not found', 404);

    await db('content_flags')
      .where('id', id)
      .update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: db.fn.now()
      });

    successResponse(res, null, 'Product approved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove flagged product
 * @route   POST /api/admin/content-moderation/products/:id/remove
 * @access  Private/Admin
 */
exports.removeProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const flag = await db('content_flags')
      .where('id', id)
      .where('flaggable_type', 'product')
      .first();

    if (!flag) throw new AppError('Flagged product not found', 404);

    await db.transaction(async (trx) => {
      // Deactivate product
      await trx('products')
        .where('id', flag.flaggable_id)
        .update({ status: 'inactive', updated_at: db.fn.now() });

      // Update flag status
      await trx('content_flags')
        .where('id', id)
        .update({
          status: 'removed',
          reviewed_by: req.user.id,
          reviewed_at: db.fn.now(),
          admin_notes: reason
        });
    });

    successResponse(res, null, 'Product removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve flagged review
 * @route   POST /api/admin/content-moderation/reviews/:id/approve
 * @access  Private/Admin
 */
exports.approveReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const flag = await db('content_flags')
      .where('id', id)
      .where('flaggable_type', 'review')
      .first();

    if (!flag) throw new AppError('Flagged review not found', 404);

    await db('content_flags')
      .where('id', id)
      .update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: db.fn.now()
      });

    successResponse(res, null, 'Review approved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove flagged review
 * @route   POST /api/admin/content-moderation/reviews/:id/remove
 * @access  Private/Admin
 */
exports.removeReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const flag = await db('content_flags')
      .where('id', id)
      .where('flaggable_type', 'review')
      .first();

    if (!flag) throw new AppError('Flagged review not found', 404);

    await db.transaction(async (trx) => {
      // Delete or deactivate review
      await trx('reviews')
        .where('id', flag.flaggable_id)
        .update({ status: 'removed', updated_at: db.fn.now() });

      // Update flag status
      await trx('content_flags')
        .where('id', id)
        .update({
          status: 'removed',
          reviewed_by: req.user.id,
          reviewed_at: db.fn.now(),
          admin_notes: reason
        });
    });

    successResponse(res, null, 'Review removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get moderation statistics
 * @route   GET /api/admin/content-moderation/stats
 * @access  Private/Admin
 */
exports.getModerationStats = async (req, res, next) => {
  try {
    const [{ total_flags }] = await db('content_flags').count('* as total_flags');
    const [{ pending_flags }] = await db('content_flags').where('status', 'pending').count('* as pending_flags');

    const flagsByType = await db('content_flags')
      .select('flaggable_type')
      .count('* as count')
      .groupBy('flaggable_type');

    const flagsByReason = await db('content_flags')
      .select('reason')
      .count('* as count')
      .groupBy('reason')
      .orderBy('count', 'desc')
      .limit(5);

    successResponse(res, {
      total_flags: parseInt(total_flags) || 0,
      pending_flags: parseInt(pending_flags) || 0,
      flags_by_type: flagsByType,
      common_reasons: flagsByReason
    }, 'Moderation statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get common report reasons
 * @route   GET /api/admin/content-moderation/common-reasons
 * @access  Private/Admin
 */
exports.getCommonReportReasons = async (req, res, next) => {
  try {
    const reasons = [
      { value: 'inappropriate', label: 'Contenu inapproprié' },
      { value: 'spam', label: 'Spam' },
      { value: 'misleading', label: 'Information trompeuse' },
      { value: 'copyright', label: 'Violation de droits d\'auteur' },
      { value: 'offensive', label: 'Contenu offensant' },
      { value: 'fake', label: 'Produit contrefait' },
      { value: 'other', label: 'Autre' }
    ];

    successResponse(res, { reasons }, 'Common report reasons retrieved successfully');
  } catch (error) {
    next(error);
  }
};
