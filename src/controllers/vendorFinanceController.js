const db = require('../config/database');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @desc    Get vendor revenue summary
 * @route   GET /api/vendor/finances/revenue-summary
 * @access  Private (Vendor)
 */
exports.getRevenueSummary = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d' } = req.query;

  // Calculate date range
  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Total revenue
  const totalRevenue = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.payment_status', 'paid')
    .where('orders.created_at', '>=', dateFrom)
    .sum('order_items.quantity * order_items.price as total')
    .first();

  // Commission (platform fee)
  const commission = await db('vendor_transactions')
    .where('vendor_id', vendorId)
    .where('type', 'commission')
    .where('created_at', '>=', dateFrom)
    .sum('amount as total')
    .first();

  // Net revenue (after commission)
  const netRevenue = (totalRevenue.total || 0) - Math.abs(commission.total || 0);

  // Pending balance
  const pendingBalance = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.payment_status', 'paid')
    .whereNotIn('orders.id', function() {
      this.select('order_id')
        .from('vendor_payouts')
        .where('vendor_id', vendorId)
        .where('status', 'paid');
    })
    .sum('order_items.quantity * order_items.price as total')
    .first();

  // Available balance (can be withdrawn)
  const availableBalance = await db('vendor_wallets')
    .where('vendor_id', vendorId)
    .select('available_balance')
    .first();

  // Revenue trend (daily breakdown)
  const revenueTrend = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.payment_status', 'paid')
    .where('orders.created_at', '>=', dateFrom)
    .select(db.raw('DATE(orders.created_at) as date'))
    .sum('order_items.quantity * order_items.price as revenue')
    .groupBy('date')
    .orderBy('date', 'asc');

  res.json({
    success: true,
    data: {
      totalRevenue: totalRevenue.total || 0,
      commission: Math.abs(commission.total || 0),
      netRevenue,
      pendingBalance: pendingBalance.total || 0,
      availableBalance: availableBalance?.available_balance || 0,
      currency: 'XOF',
      period,
      revenueTrend
    }
  });
});

/**
 * @desc    Get vendor payouts
 * @route   GET /api/vendor/finances/payouts
 * @access  Private (Vendor)
 */
exports.getPayouts = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  let query = db('vendor_payouts')
    .where('vendor_id', vendorId)
    .select('*');

  if (status) {
    query = query.where('status', status);
  }

  // Get total count
  const totalCount = await query.clone().count('* as count').first();

  // Get payouts
  const payouts = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  res.json({
    success: true,
    data: {
      payouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    }
  });
});

/**
 * @desc    Request payout
 * @route   POST /api/vendor/finances/request-payout
 * @access  Private (Vendor)
 */
exports.requestPayout = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { amount, payment_method, account_details } = req.body;

  // Validate amount
  if (!amount || amount <= 0) {
    throw new AppError('Montant invalide', 400);
  }

  // Check minimum payout amount (e.g., 10,000 XOF)
  const MIN_PAYOUT = 10000;
  if (amount < MIN_PAYOUT) {
    throw new AppError(`Le montant minimum de retrait est ${MIN_PAYOUT} XOF`, 400);
  }

  // Get vendor wallet
  const wallet = await db('vendor_wallets')
    .where('vendor_id', vendorId)
    .first();

  if (!wallet) {
    throw new AppError('Portefeuille introuvable', 404);
  }

  // Check available balance
  if (wallet.available_balance < amount) {
    throw new AppError('Solde disponible insuffisant', 400);
  }

  // Validate payment method
  const validMethods = ['mtn_money', 'orange_money', 'moov_money', 'bank_transfer'];
  if (!validMethods.includes(payment_method)) {
    throw new AppError('Méthode de paiement invalide', 400);
  }

  // Create payout request
  const [payoutId] = await db('vendor_payouts').insert({
    vendor_id: vendorId,
    amount,
    payment_method,
    account_details: JSON.stringify(account_details),
    status: 'pending',
    requested_at: db.fn.now(),
    created_at: db.fn.now()
  });

  // Update wallet (move from available to pending)
  await db('vendor_wallets')
    .where('vendor_id', vendorId)
    .update({
      available_balance: db.raw('available_balance - ?', [amount]),
      pending_balance: db.raw('pending_balance + ?', [amount]),
      updated_at: db.fn.now()
    });

  // Create transaction record
  await db('vendor_transactions').insert({
    vendor_id: vendorId,
    type: 'withdrawal_request',
    amount: -amount,
    description: 'Demande de retrait',
    reference: `PAYOUT-${payoutId}`,
    created_at: db.fn.now()
  });

  // TODO: Send notification to admin
  // await notificationService.notifyAdminPayoutRequest(vendorId, payoutId);

  res.json({
    success: true,
    message: 'Demande de retrait envoyée avec succès',
    data: {
      payoutId,
      amount,
      status: 'pending'
    }
  });
});

/**
 * @desc    Get vendor transactions
 * @route   GET /api/vendor/finances/transactions
 * @access  Private (Vendor)
 */
exports.getTransactions = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { 
    page = 1, 
    limit = 20, 
    type,
    dateFrom,
    dateTo
  } = req.query;
  const offset = (page - 1) * limit;

  let query = db('vendor_transactions')
    .where('vendor_id', vendorId)
    .select('*');

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
  const totalCount = await query.clone().count('* as count').first();

  // Get transactions
  const transactions = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    }
  });
});

/**
 * @desc    Get revenue chart data
 * @route   GET /api/vendor/finances/revenue-chart
 * @access  Private (Vendor)
 */
exports.getRevenueChart = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d', groupBy = 'day' } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  let dateFormat;
  switch (groupBy) {
    case 'hour':
      dateFormat = 'DATE_FORMAT(orders.created_at, "%Y-%m-%d %H:00:00")';
      break;
    case 'week':
      dateFormat = 'DATE_FORMAT(orders.created_at, "%Y-%u")';
      break;
    case 'month':
      dateFormat = 'DATE_FORMAT(orders.created_at, "%Y-%m")';
      break;
    default:
      dateFormat = 'DATE(orders.created_at)';
  }

  const chartData = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.payment_status', 'paid')
    .where('orders.created_at', '>=', dateFrom)
    .select(db.raw(`${dateFormat} as period`))
    .sum('order_items.quantity * order_items.price as revenue')
    .count('DISTINCT orders.id as orders_count')
    .groupBy('period')
    .orderBy('period', 'asc');

  res.json({
    success: true,
    data: {
      chartData,
      period,
      groupBy
    }
  });
});

/**
 * @desc    Get payout stats
 * @route   GET /api/vendor/finances/payout-stats
 * @access  Private (Vendor)
 */
exports.getPayoutStats = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;

  // Total payouts
  const totalPayouts = await db('vendor_payouts')
    .where('vendor_id', vendorId)
    .where('status', 'paid')
    .sum('amount as total')
    .first();

  // Pending payouts
  const pendingPayouts = await db('vendor_payouts')
    .where('vendor_id', vendorId)
    .where('status', 'pending')
    .sum('amount as total')
    .count('* as count')
    .first();

  // Last payout
  const lastPayout = await db('vendor_payouts')
    .where('vendor_id', vendorId)
    .where('status', 'paid')
    .orderBy('paid_at', 'desc')
    .first();

  // Average payout time (in days)
  const avgPayoutTime = await db('vendor_payouts')
    .where('vendor_id', vendorId)
    .where('status', 'paid')
    .whereNotNull('paid_at')
    .select(db.raw('AVG(DATEDIFF(paid_at, requested_at)) as avg_days'))
    .first();

  res.json({
    success: true,
    data: {
      totalPayouts: totalPayouts.total || 0,
      pendingAmount: pendingPayouts.total || 0,
      pendingCount: pendingPayouts.count || 0,
      lastPayout: lastPayout || null,
      averagePayoutDays: Math.round(avgPayoutTime.avg_days || 0),
      currency: 'XOF'
    }
  });
});

/**
 * @desc    Export transactions
 * @route   GET /api/vendor/finances/export-transactions
 * @access  Private (Vendor)
 */
exports.exportTransactions = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { format = 'csv', dateFrom, dateTo } = req.query;

  let query = db('vendor_transactions')
    .where('vendor_id', vendorId)
    .select('*');

  if (dateFrom) {
    query = query.where('created_at', '>=', dateFrom);
  }

  if (dateTo) {
    query = query.where('created_at', '<=', dateTo);
  }

  const transactions = await query.orderBy('created_at', 'desc');

  // TODO: Generate CSV/Excel file
  // if (format === 'csv') {
  //   const csv = await csvService.generateTransactionsCSV(transactions);
  //   res.setHeader('Content-Type', 'text/csv');
  //   res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  //   return res.send(csv);
  // }

  res.json({
    success: true,
    message: 'Export généré',
    data: {
      downloadUrl: `/exports/transactions-${vendorId}.${format}`,
      recordCount: transactions.length
    }
  });
});
