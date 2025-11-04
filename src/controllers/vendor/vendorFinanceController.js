const db = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get vendor revenue summary
 * @route   GET /api/vendor/finances/revenue
 * @access  Private/Vendor
 */
exports.getRevenueSummary = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { dateFrom, dateTo } = req.query;

    let query = db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('o.payment_status', 'paid');

    if (dateFrom) {
      query = query.where('o.created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('o.created_at', '<=', dateTo);
    }

    // Total revenue
    const [{ total_revenue }] = await query.clone()
      .sum('oi.subtotal as total_revenue');

    // Commission (assuming 10% platform fee)
    const commission_rate = 0.10;
    const total_commission = total_revenue * commission_rate;
    const net_revenue = total_revenue - total_commission;

    // Total orders
    const [{ total_orders }] = await query.clone()
      .countDistinct('o.id as total_orders');

    // Average order value
    const avg_order_value = total_revenue / total_orders || 0;

    // Pending balance (paid orders not yet withdrawn)
    const [{ pending_balance }] = await db('vendor_balances')
      .where('vendor_id', vendorId)
      .sum('amount as pending_balance');

    // Available for withdrawal
    const [{ available_balance }] = await db('vendor_balances')
      .where('vendor_id', vendorId)
      .where('status', 'available')
      .sum('amount as available_balance');

    // Total withdrawn
    const [{ total_withdrawn }] = await db('vendor_payouts')
      .where('vendor_id', vendorId)
      .where('status', 'completed')
      .sum('amount as total_withdrawn');

    // Revenue trend (last 30 days by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueTrend = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('o.payment_status', 'paid')
      .where('o.created_at', '>=', thirtyDaysAgo)
      .select(db.raw('DATE(o.created_at) as date'))
      .sum('oi.subtotal as revenue')
      .groupBy(db.raw('DATE(o.created_at)'))
      .orderBy('date', 'asc');

    successResponse(res, {
      total_revenue: parseFloat(total_revenue) || 0,
      total_commission: parseFloat(total_commission.toFixed(2)) || 0,
      net_revenue: parseFloat(net_revenue.toFixed(2)) || 0,
      commission_rate: commission_rate * 100,
      total_orders: parseInt(total_orders) || 0,
      avg_order_value: parseFloat(avg_order_value.toFixed(2)),
      pending_balance: parseFloat(pending_balance) || 0,
      available_balance: parseFloat(available_balance) || 0,
      total_withdrawn: parseFloat(total_withdrawn) || 0,
      revenue_trend: revenueTrend
    }, 'Revenue summary retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor payouts
 * @route   GET /api/vendor/finances/payouts
 * @access  Private/Vendor
 */
exports.getPayouts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (page - 1) * limit;

    let query = db('vendor_payouts')
      .where('vendor_id', vendorId);

    if (status) {
      query = query.where('status', status);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');

    // Get payouts
    const payouts = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    successResponse(res, {
      payouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    }, 'Payouts retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request payout
 * @route   POST /api/vendor/finances/payouts/request
 * @access  Private/Vendor
 */
exports.requestPayout = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { amount, payment_method, account_details } = req.body;

    // Check available balance
    const [{ available_balance }] = await db('vendor_balances')
      .where('vendor_id', vendorId)
      .where('status', 'available')
      .sum('amount as available_balance');

    if (!available_balance || available_balance < amount) {
      throw new AppError('Insufficient balance for withdrawal', 400);
    }

    // Minimum payout amount (10,000 XOF)
    const MIN_PAYOUT = 10000;
    if (amount < MIN_PAYOUT) {
      throw new AppError(`Minimum payout amount is ${MIN_PAYOUT} XOF`, 400);
    }

    await db.transaction(async (trx) => {
      // Create payout request
      const [payoutId] = await trx('vendor_payouts').insert({
        vendor_id: vendorId,
        amount,
        payment_method,
        account_details: JSON.stringify(account_details),
        status: 'pending',
        requested_at: db.fn.now(),
        created_at: db.fn.now()
      });

      // Update vendor balance
      await trx('vendor_balances')
        .where('vendor_id', vendorId)
        .where('status', 'available')
        .update({
          status: 'pending_withdrawal',
          payout_id: payoutId,
          updated_at: db.fn.now()
        });
    });

    successResponse(res, null, 'Payout request submitted successfully', 201);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor transactions
 * @route   GET /api/vendor/finances/transactions
 * @access  Private/Vendor
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, type, dateFrom, dateTo } = req.query;

    const offset = (page - 1) * limit;

    let query = db('vendor_transactions')
      .where('vendor_id', vendorId);

    if (type) {
      query = query.where('type', type);
    }

    if (dateFrom) {
      query = query.where('created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('created_at', '<=', dateTo);
    }

    // Get total count
    const [{ count: total }] = await query.clone().count('* as count');

    // Get transactions
    const transactions = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    successResponse(res, {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    }, 'Transactions retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue chart data
 * @route   GET /api/vendor/finances/revenue-chart
 * @access  Private/Vendor
 */
exports.getRevenueChart = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { period = 'month' } = req.query;

    let dateFormat, dateFrom;

    switch (period) {
      case 'week':
        dateFormat = 'DATE(o.created_at)';
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFormat = 'DATE(o.created_at)';
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case 'year':
        dateFormat = 'DATE_FORMAT(o.created_at, "%Y-%m")';
        dateFrom = new Date();
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
      default:
        dateFormat = 'DATE(o.created_at)';
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    const chartData = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('o.payment_status', 'paid')
      .where('o.created_at', '>=', dateFrom)
      .select(db.raw(`${dateFormat} as date`))
      .sum('oi.subtotal as revenue')
      .count('DISTINCT o.id as orders')
      .groupBy(db.raw(dateFormat))
      .orderBy('date', 'asc');

    successResponse(res, { chart_data: chartData }, 'Revenue chart data retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment methods
 * @route   GET /api/vendor/finances/payment-methods
 * @access  Private/Vendor
 */
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const paymentMethods = await db('vendor_payment_methods')
      .where('vendor_id', vendorId)
      .select('*');

    successResponse(res, { payment_methods: paymentMethods }, 'Payment methods retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add payment method
 * @route   POST /api/vendor/finances/payment-methods
 * @access  Private/Vendor
 */
exports.addPaymentMethod = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { type, account_name, account_number, bank_name, phone_number, is_default } = req.body;

    await db.transaction(async (trx) => {
      // If this is set as default, unset others
      if (is_default) {
        await trx('vendor_payment_methods')
          .where('vendor_id', vendorId)
          .update({ is_default: false });
      }

      // Add new payment method
      await trx('vendor_payment_methods').insert({
        vendor_id: vendorId,
        type,
        account_name,
        account_number,
        bank_name,
        phone_number,
        is_default: is_default || false,
        created_at: db.fn.now()
      });
    });

    successResponse(res, null, 'Payment method added successfully', 201);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete payment method
 * @route   DELETE /api/vendor/finances/payment-methods/:id
 * @access  Private/Vendor
 */
exports.deletePaymentMethod = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const method = await db('vendor_payment_methods')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!method) {
      throw new AppError('Payment method not found', 404);
    }

    await db('vendor_payment_methods')
      .where('id', id)
      .delete();

    successResponse(res, null, 'Payment method deleted successfully');

  } catch (error) {
    next(error);
  }
};
