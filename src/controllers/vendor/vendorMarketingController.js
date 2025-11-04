const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get marketing campaigns
 * @route   GET /api/vendor/marketing/campaigns
 * @access  Private/Vendor
 */
exports.getCampaigns = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (page - 1) * limit;

    let query = db('marketing_campaigns')
      .where('vendor_id', vendorId);

    if (status) query = query.where('status', status);
    if (type) query = query.where('type', type);

    const [{ count: total }] = await query.clone().count('* as count');
    const campaigns = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    successResponse(res, {
      campaigns,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Campaigns retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create campaign
 * @route   POST /api/vendor/marketing/campaigns
 * @access  Private/Vendor
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, type, description, budget, start_date, end_date, target_audience } = req.body;

    const [campaignId] = await db('marketing_campaigns').insert({
      vendor_id: vendorId,
      name,
      type,
      description,
      budget,
      start_date,
      end_date,
      target_audience: JSON.stringify(target_audience),
      status: 'draft',
      created_at: db.fn.now()
    });

    const campaign = await db('marketing_campaigns').where('id', campaignId).first();
    successResponse(res, { campaign }, 'Campaign created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get coupons
 * @route   GET /api/vendor/marketing/coupons
 * @access  Private/Vendor
 */
exports.getCoupons = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('coupons')
      .where('vendor_id', vendorId);

    if (status) query = query.where('status', status);

    const [{ count: total }] = await query.clone().count('* as count');
    const coupons = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    successResponse(res, {
      coupons,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Coupons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create coupon
 * @route   POST /api/vendor/marketing/coupons
 * @access  Private/Vendor
 */
exports.createCoupon = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { code, type, value, min_purchase, max_discount, start_date, end_date, usage_limit } = req.body;

    // Check if code already exists
    const existing = await db('coupons').where('code', code).first();
    if (existing) throw new AppError('Coupon code already exists', 400);

    const [couponId] = await db('coupons').insert({
      vendor_id: vendorId,
      code: code.toUpperCase(),
      type,
      value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
      usage_limit,
      status: 'active',
      created_at: db.fn.now()
    });

    const coupon = await db('coupons').where('id', couponId).first();
    successResponse(res, { coupon }, 'Coupon created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get marketing stats
 * @route   GET /api/vendor/marketing/stats
 * @access  Private/Vendor
 */
exports.getMarketingStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Active campaigns
    const [{ active_campaigns }] = await db('marketing_campaigns')
      .where('vendor_id', vendorId)
      .where('status', 'active')
      .count('* as active_campaigns');

    // Active coupons
    const [{ active_coupons }] = await db('coupons')
      .where('vendor_id', vendorId)
      .where('status', 'active')
      .count('* as active_coupons');

    // Total coupon usage
    const [{ total_coupon_usage }] = await db('coupon_usage as cu')
      .join('coupons as c', 'cu.coupon_id', 'c.id')
      .where('c.vendor_id', vendorId)
      .count('* as total_coupon_usage');

    // Revenue from coupons
    const [{ coupon_revenue }] = await db('orders as o')
      .join('order_coupons as oc', 'o.id', 'oc.order_id')
      .join('coupons as c', 'oc.coupon_id', 'c.id')
      .where('c.vendor_id', vendorId)
      .where('o.payment_status', 'paid')
      .sum('o.total_amount as coupon_revenue');

    successResponse(res, {
      active_campaigns: parseInt(active_campaigns) || 0,
      active_coupons: parseInt(active_coupons) || 0,
      total_coupon_usage: parseInt(total_coupon_usage) || 0,
      coupon_revenue: parseFloat(coupon_revenue) || 0
    }, 'Marketing stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update campaign
 * @route   PUT /api/vendor/marketing/campaigns/:id
 * @access  Private/Vendor
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const campaign = await db('marketing_campaigns')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!campaign) throw new AppError('Campaign not found', 404);

    await db('marketing_campaigns')
      .where('id', id)
      .update({ ...req.body, updated_at: db.fn.now() });

    const updated = await db('marketing_campaigns').where('id', id).first();
    successResponse(res, { campaign: updated }, 'Campaign updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete campaign
 * @route   DELETE /api/vendor/marketing/campaigns/:id
 * @access  Private/Vendor
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const campaign = await db('marketing_campaigns')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!campaign) throw new AppError('Campaign not found', 404);

    await db('marketing_campaigns').where('id', id).delete();
    successResponse(res, null, 'Campaign deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle coupon status
 * @route   PATCH /api/vendor/marketing/coupons/:id/toggle
 * @access  Private/Vendor
 */
exports.toggleCouponStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const coupon = await db('coupons')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!coupon) throw new AppError('Coupon not found', 404);

    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
    await db('coupons')
      .where('id', id)
      .update({ status: newStatus, updated_at: db.fn.now() });

    const updated = await db('coupons').where('id', id).first();
    successResponse(res, { coupon: updated }, 'Coupon status updated successfully');
  } catch (error) {
    next(error);
  }
};
