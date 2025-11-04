const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get all transactions
 * @route   GET /api/admin/transactions
 * @access  Private/Admin
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, payment_method, start_date, end_date, search } = req.query;
    const offset = (page - 1) * limit;

    let query = db('transactions as t')
      .join('orders as o', 't.order_id', 'o.id')
      .join('users as u', 'o.customer_id', 'u.id')
      .leftJoin('vendors as v', 't.vendor_id', 'v.id')
      .select(
        't.id',
        't.transaction_id',
        't.amount',
        't.currency',
        't.payment_method',
        't.status',
        't.payment_provider',
        't.transaction_type',
        't.created_at',
        'o.id as order_id',
        'o.order_number',
        'u.first_name',
        'u.last_name',
        'u.email',
        'v.business_name as vendor_name'
      );

    if (status) query = query.where('t.status', status);
    if (payment_method) query = query.where('t.payment_method', payment_method);
    if (start_date) query = query.where('t.created_at', '>=', start_date);
    if (end_date) query = query.where('t.created_at', '<=', end_date);
    if (search) {
      query = query.where(function() {
        this.where('t.transaction_id', 'like', `%${search}%`)
          .orWhere('o.order_number', 'like', `%${search}%`)
          .orWhere('u.email', 'like', `%${search}%`);
      });
    }

    const [{ count: total }] = await query.clone().count('t.id as count');
    const transactions = await query
      .orderBy('t.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Transactions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transaction by ID
 * @route   GET /api/admin/transactions/:id
 * @access  Private/Admin
 */
exports.getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await db('transactions as t')
      .join('orders as o', 't.order_id', 'o.id')
      .join('users as u', 'o.customer_id', 'u.id')
      .leftJoin('vendors as v', 't.vendor_id', 'v.id')
      .where('t.id', id)
      .select(
        't.*',
        'o.order_number',
        'o.total_amount',
        'u.first_name',
        'u.last_name',
        'u.email',
        'u.phone',
        'v.business_name as vendor_name'
      )
      .first();

    if (!transaction) throw new AppError('Transaction not found', 404);

    // Parse JSON fields
    if (transaction.metadata) {
      transaction.metadata = JSON.parse(transaction.metadata);
    }

    successResponse(res, { transaction }, 'Transaction retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transaction statistics
 * @route   GET /api/admin/transactions/stats
 * @access  Private/Admin
 */
exports.getTransactionStats = async (req, res, next) => {
  try {
    const [{ total_transactions }] = await db('transactions').count('* as total_transactions');
    const [{ total_volume }] = await db('transactions')
      .where('status', 'completed')
      .sum('amount as total_volume');

    const statusBreakdown = await db('transactions')
      .select('status')
      .count('* as count')
      .sum('amount as total_amount')
      .groupBy('status');

    const paymentMethodBreakdown = await db('transactions')
      .select('payment_method')
      .count('* as count')
      .sum('amount as total_amount')
      .groupBy('payment_method')
      .orderBy('count', 'desc');

    // Recent 7 days volume
    const recentVolume = await db('transactions')
      .where('status', 'completed')
      .where('created_at', '>=', db.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
      .select(db.raw('DATE(created_at) as date'))
      .sum('amount as volume')
      .count('* as count')
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'desc');

    successResponse(res, {
      total_transactions: parseInt(total_transactions) || 0,
      total_volume: parseFloat(total_volume) || 0,
      status_breakdown: statusBreakdown,
      payment_method_breakdown: paymentMethodBreakdown,
      recent_volume: recentVolume
    }, 'Transaction statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve dispute
 * @route   POST /api/admin/transactions/:id/resolve-dispute
 * @access  Private/Admin
 */
exports.resolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, admin_notes, refund_amount } = req.body;

    const transaction = await db('transactions').where('id', id).first();
    if (!transaction) throw new AppError('Transaction not found', 404);

    await db.transaction(async (trx) => {
      // Update transaction
      await trx('transactions')
        .where('id', id)
        .update({
          status: resolution === 'refund' ? 'refunded' : 'completed',
          admin_notes,
          updated_at: db.fn.now()
        });

      // Create dispute record
      await trx('transaction_disputes').insert({
        transaction_id: id,
        resolution,
        refund_amount: refund_amount || null,
        resolved_by: req.user.id,
        admin_notes,
        resolved_at: db.fn.now()
      });

      // If refund, update vendor balance
      if (resolution === 'refund' && transaction.vendor_id) {
        await trx('vendor_balances')
          .where('vendor_id', transaction.vendor_id)
          .decrement('available_balance', refund_amount || transaction.amount);
      }
    });

    successResponse(res, null, 'Dispute resolved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refund transaction
 * @route   POST /api/admin/transactions/:id/refund
 * @access  Private/Admin
 */
exports.refundTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, refund_amount } = req.body;

    const transaction = await db('transactions').where('id', id).first();
    if (!transaction) throw new AppError('Transaction not found', 404);

    if (transaction.status === 'refunded') {
      throw new AppError('Transaction already refunded', 400);
    }

    const finalRefundAmount = refund_amount || transaction.amount;

    await db.transaction(async (trx) => {
      // Update transaction status
      await trx('transactions')
        .where('id', id)
        .update({
          status: 'refunded',
          admin_notes: reason,
          updated_at: db.fn.now()
        });

      // Create refund record
      await trx('refunds').insert({
        transaction_id: id,
        amount: finalRefundAmount,
        reason,
        processed_by: req.user.id,
        status: 'completed',
        created_at: db.fn.now()
      });

      // Update vendor balance
      if (transaction.vendor_id) {
        await trx('vendor_balances')
          .where('vendor_id', transaction.vendor_id)
          .decrement('available_balance', finalRefundAmount);
      }
    });

    successResponse(res, null, 'Transaction refunded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export transactions
 * @route   GET /api/admin/transactions/export
 * @access  Private/Admin
 */
exports.exportTransactions = async (req, res, next) => {
  try {
    const { start_date, end_date, status, payment_method } = req.query;

    let query = db('transactions as t')
      .join('orders as o', 't.order_id', 'o.id')
      .join('users as u', 'o.customer_id', 'u.id')
      .leftJoin('vendors as v', 't.vendor_id', 'v.id')
      .select(
        't.transaction_id',
        't.amount',
        't.currency',
        't.payment_method',
        't.status',
        't.created_at',
        'o.order_number',
        'u.email',
        'v.business_name'
      );

    if (status) query = query.where('t.status', status);
    if (payment_method) query = query.where('t.payment_method', payment_method);
    if (start_date) query = query.where('t.created_at', '>=', start_date);
    if (end_date) query = query.where('t.created_at', '<=', end_date);

    const transactions = await query.orderBy('t.created_at', 'desc');

    // Format CSV
    const csvRows = [
      'Transaction ID,Montant,Devise,Méthode,Statut,Date,Commande,Client,Vendeur'
    ];

    transactions.forEach(t => {
      csvRows.push([
        t.transaction_id,
        t.amount,
        t.currency,
        t.payment_method,
        t.status,
        new Date(t.created_at).toISOString(),
        t.order_number,
        t.email,
        t.business_name || 'N/A'
      ].join(','));
    });

    successResponse(res, { csv: csvRows.join('\n') }, 'Transactions exported successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transactions by payment method
 * @route   GET /api/admin/transactions/by-payment-method
 * @access  Private/Admin
 */
exports.getTransactionsByPaymentMethod = async (req, res, next) => {
  try {
    const { payment_method } = req.query;

    const transactions = await db('transactions')
      .where('payment_method', payment_method)
      .orderBy('created_at', 'desc')
      .limit(100)
      .select('*');

    successResponse(res, { transactions }, 'Transactions retrieved successfully');
  } catch (error) {
    next(error);
  }
};
