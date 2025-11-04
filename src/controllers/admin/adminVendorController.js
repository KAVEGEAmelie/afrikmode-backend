const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get all vendors
 * @route   GET /api/admin/vendors
 * @access  Private/Admin
 */
exports.getVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, plan, sortBy = 'created_at', search } = req.query;
    const offset = (page - 1) * limit;

    let query = db('vendors as v')
      .leftJoin('users as u', 'v.user_id', 'u.id')
      .select(
        'v.id',
        'v.business_name',
        'v.contact_email',
        'v.contact_phone',
        'v.subscription_plan',
        'v.status',
        'v.created_at',
        'v.approved_at',
        'u.email as user_email',
        'u.first_name',
        'u.last_name',
        db.raw('(SELECT COUNT(*) FROM products WHERE vendor_id = v.id) as products_count'),
        db.raw('(SELECT COUNT(*) FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.vendor_id = v.id) as sales_count'),
        db.raw('(SELECT COALESCE(SUM(oi.subtotal), 0) FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.vendor_id = v.id AND o.payment_status = "paid") as total_revenue'),
        db.raw('(SELECT COUNT(*) FROM vendor_sanctions WHERE vendor_id = v.id) as warnings_count')
      );

    if (status) query = query.where('v.status', status);
    if (plan) query = query.where('v.subscription_plan', plan);
    if (search) {
      query = query.where(function() {
        this.where('v.business_name', 'like', `%${search}%`)
            .orWhere('v.contact_email', 'like', `%${search}%`)
            .orWhere('u.email', 'like', `%${search}%`);
      });
    }

    const [{ count: total }] = await query.clone().count('v.id as count');
    const vendors = await query
      .orderBy(sortBy, 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      vendors,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Vendors retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor by ID
 * @route   GET /api/admin/vendors/:id
 * @access  Private/Admin
 */
exports.getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await db('vendors as v')
      .leftJoin('users as u', 'v.user_id', 'u.id')
      .where('v.id', id)
      .select('v.*', 'u.email', 'u.first_name', 'u.last_name', 'u.phone')
      .first();

    if (!vendor) throw new AppError('Vendor not found', 404);

    // Get additional stats
    const [{ products_count }] = await db('products')
      .where('vendor_id', id)
      .count('* as products_count');

    const [{ orders_count }] = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', id)
      .countDistinct('o.id as orders_count');

    const [{ total_revenue }] = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', id)
      .where('o.payment_status', 'paid')
      .sum('oi.subtotal as total_revenue');

    // Parse JSON fields
    vendor.business_address = vendor.business_address ? JSON.parse(vendor.business_address) : null;
    vendor.social_media = vendor.social_media ? JSON.parse(vendor.social_media) : null;

    successResponse(res, {
      vendor: {
        ...vendor,
        products_count: parseInt(products_count) || 0,
        orders_count: parseInt(orders_count) || 0,
        total_revenue: parseFloat(total_revenue) || 0
      }
    }, 'Vendor retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send warning to vendor
 * @route   POST /api/admin/vendors/:id/warning
 * @access  Private/Admin
 */
exports.sendWarning = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) throw new AppError('Warning reason is required', 400);

    const vendor = await db('vendors').where('id', id).first();
    if (!vendor) throw new AppError('Vendor not found', 404);

    await db('vendor_sanctions').insert({
      vendor_id: id,
      type: 'warning',
      reason,
      issued_by: req.user.id,
      created_at: db.fn.now()
    });

    // TODO: Send warning email to vendor

    successResponse(res, null, 'Warning sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Suspend vendor
 * @route   POST /api/admin/vendors/:id/suspend
 * @access  Private/Admin
 */
exports.suspendVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { duration_days, reason } = req.body;

    if (!reason) throw new AppError('Suspension reason is required', 400);

    const vendor = await db('vendors').where('id', id).first();
    if (!vendor) throw new AppError('Vendor not found', 404);

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + (duration_days || 30));

    await db.transaction(async (trx) => {
      // Update vendor status
      await trx('vendors')
        .where('id', id)
        .update({
          status: 'suspended',
          suspended_until: suspendedUntil,
          updated_at: db.fn.now()
        });

      // Record sanction
      await trx('vendor_sanctions').insert({
        vendor_id: id,
        type: 'suspension',
        reason,
        duration_days,
        issued_by: req.user.id,
        created_at: db.fn.now()
      });
    });

    // TODO: Send suspension email to vendor

    successResponse(res, null, 'Vendor suspended successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ban vendor
 * @route   POST /api/admin/vendors/:id/ban
 * @access  Private/Admin
 */
exports.banVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) throw new AppError('Ban reason is required', 400);

    const vendor = await db('vendors').where('id', id).first();
    if (!vendor) throw new AppError('Vendor not found', 404);

    await db.transaction(async (trx) => {
      // Update vendor status
      await trx('vendors')
        .where('id', id)
        .update({
          status: 'banned',
          banned_at: db.fn.now(),
          updated_at: db.fn.now()
        });

      // Deactivate all products
      await trx('products')
        .where('vendor_id', id)
        .update({ status: 'inactive' });

      // Record sanction
      await trx('vendor_sanctions').insert({
        vendor_id: id,
        type: 'ban',
        reason,
        issued_by: req.user.id,
        created_at: db.fn.now()
      });
    });

    // TODO: Send ban notification email

    successResponse(res, null, 'Vendor banned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reactivate vendor
 * @route   POST /api/admin/vendors/:id/reactivate
 * @access  Private/Admin
 */
exports.reactivateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await db('vendors').where('id', id).first();
    if (!vendor) throw new AppError('Vendor not found', 404);

    await db('vendors')
      .where('id', id)
      .update({
        status: 'active',
        suspended_until: null,
        banned_at: null,
        updated_at: db.fn.now()
      });

    // TODO: Send reactivation email

    successResponse(res, null, 'Vendor reactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendors statistics
 * @route   GET /api/admin/vendors/stats
 * @access  Private/Admin
 */
exports.getVendorsStats = async (req, res, next) => {
  try {
    const [{ total_vendors }] = await db('vendors').count('* as total_vendors');

    const vendorsByStatus = await db('vendors')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const vendorsByPlan = await db('vendors')
      .select('subscription_plan')
      .count('* as count')
      .groupBy('subscription_plan');

    const [{ total_revenue }] = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .join('vendors as v', 'p.vendor_id', 'v.id')
      .where('o.payment_status', 'paid')
      .sum('oi.subtotal as total_revenue');

    const [{ active_vendors }] = await db('vendors')
      .where('status', 'active')
      .count('* as active_vendors');

    successResponse(res, {
      total_vendors: parseInt(total_vendors) || 0,
      active_vendors: parseInt(active_vendors) || 0,
      total_revenue: parseFloat(total_revenue) || 0,
      vendors_by_status: vendorsByStatus,
      vendors_by_plan: vendorsByPlan
    }, 'Vendors statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor sanction history
 * @route   GET /api/admin/vendors/:id/sanction-history
 * @access  Private/Admin
 */
exports.getVendorSanctionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await db('vendors').where('id', id).first();
    if (!vendor) throw new AppError('Vendor not found', 404);

    const sanctions = await db('vendor_sanctions as vs')
      .leftJoin('users as u', 'vs.issued_by', 'u.id')
      .where('vs.vendor_id', id)
      .select(
        'vs.id',
        'vs.type',
        'vs.reason',
        'vs.duration_days',
        'vs.created_at',
        'u.first_name as issued_by_first_name',
        'u.last_name as issued_by_last_name'
      )
      .orderBy('vs.created_at', 'desc');

    successResponse(res, { sanctions }, 'Sanction history retrieved successfully');
  } catch (error) {
    next(error);
  }
};
