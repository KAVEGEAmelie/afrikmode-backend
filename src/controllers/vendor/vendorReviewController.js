const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get vendor reviews
 * @route   GET /api/vendor/reviews
 * @access  Private/Vendor
 */
exports.getVendorReviews = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, rating, status, sortBy = 'created_at' } = req.query;
    const offset = (page - 1) * limit;

    let query = db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('p.vendor_id', vendorId)
      .select(
        'r.id',
        'r.product_id',
        'r.user_id',
        'r.rating',
        'r.comment',
        'r.status',
        'r.created_at',
        'r.vendor_response',
        'r.responded_at',
        'p.name as product_name',
        'p.image_url as product_image',
        'u.first_name',
        'u.last_name',
        'u.avatar'
      );

    if (rating) query = query.where('r.rating', rating);
    if (status) query = query.where('r.status', status);

    const [{ count: total }] = await query.clone().count('r.id as count');
    const reviews = await query
      .orderBy(sortBy, 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      reviews,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Respond to review
 * @route   POST /api/vendor/reviews/:id/respond
 * @access  Private/Vendor
 */
exports.respondToReview = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { response } = req.body;

    // Verify review belongs to vendor's product
    const review = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('r.id', id)
      .where('p.vendor_id', vendorId)
      .first('r.*');

    if (!review) throw new AppError('Review not found', 404);

    await db('reviews')
      .where('id', id)
      .update({
        vendor_response: response,
        responded_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    const updated = await db('reviews').where('id', id).first();
    successResponse(res, { review: updated }, 'Response added successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get review statistics
 * @route   GET /api/vendor/reviews/stats
 * @access  Private/Vendor
 */
exports.getReviewStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Total reviews
    const [{ total_reviews }] = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .count('* as total_reviews');

    // Average rating
    const [{ avg_rating }] = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .avg('r.rating as avg_rating');

    // Rating distribution
    const ratingDistribution = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .select('r.rating')
      .count('* as count')
      .groupBy('r.rating')
      .orderBy('r.rating', 'desc');

    // Pending responses
    const [{ pending_responses }] = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .whereNull('r.vendor_response')
      .count('* as pending_responses');

    // Response rate
    const [{ responded }] = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .whereNotNull('r.vendor_response')
      .count('* as responded');

    const responseRate = total_reviews > 0 ? ((responded / total_reviews) * 100).toFixed(2) : 0;

    // Recent reviews
    const recentReviews = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .select(
        'r.id',
        'r.rating',
        'r.comment',
        'r.created_at',
        'p.name as product_name',
        'u.first_name',
        'u.last_name'
      )
      .orderBy('r.created_at', 'desc')
      .limit(5);

    successResponse(res, {
      total_reviews: parseInt(total_reviews) || 0,
      average_rating: parseFloat(avg_rating) || 0,
      rating_distribution: ratingDistribution,
      pending_responses: parseInt(pending_responses) || 0,
      response_rate: parseFloat(responseRate),
      recent_reviews: recentReviews
    }, 'Review statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending responses
 * @route   GET /api/vendor/reviews/pending
 * @access  Private/Vendor
 */
exports.getPendingResponses = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const pendingReviews = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .join('users as u', 'r.user_id', 'u.id')
      .where('p.vendor_id', vendorId)
      .where('r.status', 'approved')
      .whereNull('r.vendor_response')
      .select(
        'r.id',
        'r.rating',
        'r.comment',
        'r.created_at',
        'p.id as product_id',
        'p.name as product_name',
        'p.image_url as product_image',
        'u.first_name',
        'u.last_name',
        'u.avatar'
      )
      .orderBy('r.created_at', 'desc');

    successResponse(res, { reviews: pendingReviews }, 'Pending responses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete vendor response
 * @route   DELETE /api/vendor/reviews/:id/response
 * @access  Private/Vendor
 */
exports.deleteResponse = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    // Verify review belongs to vendor's product
    const review = await db('reviews as r')
      .join('products as p', 'r.product_id', 'p.id')
      .where('r.id', id)
      .where('p.vendor_id', vendorId)
      .first('r.*');

    if (!review) throw new AppError('Review not found', 404);

    await db('reviews')
      .where('id', id)
      .update({
        vendor_response: null,
        responded_at: null,
        updated_at: db.fn.now()
      });

    successResponse(res, null, 'Response deleted successfully');
  } catch (error) {
    next(error);
  }
};
