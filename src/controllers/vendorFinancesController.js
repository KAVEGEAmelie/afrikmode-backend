/**
 * Vendor Finances Controller
 * Gestion des finances du vendeur - Revenus, Retraits, Commissions
 */

const db = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Obtenir le résumé des revenus
 * @route   GET /api/vendor/finances/revenue-summary
 * @access  Private/Vendor
 */
exports.getRevenueSummary = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const period = req.query.period || '30days'; // 7days, 30days, 90days, 12months

  let startDate;
  switch (period) {
    case '7days':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90days':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '12months':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Revenus totaux
  const totalRevenue = await db('orders as o')
    .sum('o.total_amount as revenue')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId)
    .andWhere('o.created_at', '>=', startDate)
    .andWhere('o.status', '!=', 'cancelled')
    .andWhere('o.payment_status', 'paid')
    .first();

  // Commission de la plateforme (supposons 10%)
  const commissionRate = 0.10;
  const revenue = parseFloat(totalRevenue.revenue || 0);
  const commission = revenue * commissionRate;
  const netRevenue = revenue - commission;

  // Solde disponible (revenus - retraits)
  const totalWithdrawals = await db('vendor_payouts')
    .sum('amount as total')
    .where('vendor_id', vendorId)
    .andWhere('status', 'completed')
    .first();

  const availableBalance = netRevenue - parseFloat(totalWithdrawals.total || 0);

  // Retraits en attente
  const pendingWithdrawals = await db('vendor_payouts')
    .sum('amount as total')
    .where('vendor_id', vendorId)
    .andWhere('status', 'pending')
    .first();

  res.status(200).json({
    success: true,
    data: {
      gross_revenue: revenue,
      commission: commission,
      commission_rate: commissionRate * 100,
      net_revenue: netRevenue,
      available_balance: availableBalance,
      pending_withdrawals: parseFloat(pendingWithdrawals.total || 0),
      currency: 'XOF'
    }
  });
});

/**
 * @desc    Obtenir l'historique des paiements (payouts)
 * @route   GET /api/vendor/finances/payouts
 * @access  Private/Vendor
 */
exports.getPayouts = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status; // pending, processing, completed, cancelled

  let query = db('vendor_payouts')
    .select('*')
    .where('vendor_id', vendorId);

  if (status) {
    query = query.where('status', status);
  }

  const payouts = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  // Total pour pagination
  let totalQuery = db('vendor_payouts')
    .count('* as count')
    .where('vendor_id', vendorId);

  if (status) totalQuery = totalQuery.where('status', status);

  const total = await totalQuery.first();

  res.status(200).json({
    success: true,
    data: payouts,
    pagination: {
      page,
      limit,
      total: parseInt(total.count),
      pages: Math.ceil(total.count / limit)
    }
  });
});

/**
 * @desc    Demander un retrait
 * @route   POST /api/vendor/finances/request-payout
 * @access  Private/Vendor
 */
exports.requestPayout = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const { amount, payment_method, account_details } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Montant invalide', 400));
  }

  // Montant minimum de retrait: 10,000 XOF
  const minPayout = 10000;
  if (amount < minPayout) {
    return next(new AppError(`Le montant minimum de retrait est ${minPayout} XOF`, 400));
  }

  // Vérifier le solde disponible
  const revenue = await db('orders as o')
    .sum('o.total_amount as revenue')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId)
    .andWhere('o.status', '!=', 'cancelled')
    .andWhere('o.payment_status', 'paid')
    .first();

  const totalRevenue = parseFloat(revenue.revenue || 0);
  const commission = totalRevenue * 0.10;
  const netRevenue = totalRevenue - commission;

  const totalWithdrawals = await db('vendor_payouts')
    .sum('amount as total')
    .where('vendor_id', vendorId)
    .whereIn('status', ['completed', 'pending', 'processing'])
    .first();

  const availableBalance = netRevenue - parseFloat(totalWithdrawals.total || 0);

  if (amount > availableBalance) {
    return next(new AppError('Solde insuffisant', 400));
  }

  // Créer la demande de retrait
  const [payoutId] = await db('vendor_payouts').insert({
    vendor_id: vendorId,
    amount,
    payment_method: payment_method || 'mtn_money',
    account_details: JSON.stringify(account_details),
    status: 'pending',
    requested_at: new Date(),
    created_at: new Date()
  });

  const payout = await db('vendor_payouts')
    .where('id', payoutId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Demande de retrait créée avec succès',
    data: payout
  });
});

/**
 * @desc    Obtenir les transactions
 * @route   GET /api/vendor/finances/transactions
 * @access  Private/Vendor
 */
exports.getTransactions = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const type = req.query.type; // 'sale', 'refund', 'payout'

  let query = db('vendor_transactions')
    .select('*')
    .where('vendor_id', vendorId);

  if (type) {
    query = query.where('type', type);
  }

  const transactions = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  // Total pour pagination
  let totalQuery = db('vendor_transactions')
    .count('* as count')
    .where('vendor_id', vendorId);

  if (type) totalQuery = totalQuery.where('type', type);

  const total = await totalQuery.first();

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      page,
      limit,
      total: parseInt(total.count),
      pages: Math.ceil(total.count / limit)
    }
  });
});

/**
 * @desc    Obtenir le graphique des revenus
 * @route   GET /api/vendor/finances/revenue-chart
 * @access  Private/Vendor
 */
exports.getRevenueChart = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const period = req.query.period || '30days';

  let dateFormat, startDate;

  switch (period) {
    case '7days':
      dateFormat = '%Y-%m-%d';
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      dateFormat = '%Y-%m-%d';
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90days':
      dateFormat = '%Y-%u';
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '12months':
      dateFormat = '%Y-%m';
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      dateFormat = '%Y-%m-%d';
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const chartData = await db('orders as o')
    .select(
      db.raw(`DATE_FORMAT(o.created_at, ?) as date`, [dateFormat]),
      db.raw('SUM(o.total_amount) as gross_revenue'),
      db.raw('SUM(o.total_amount * 0.9) as net_revenue'),
      db.raw('COUNT(DISTINCT o.id) as orders_count')
    )
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId)
    .andWhere('o.created_at', '>=', startDate)
    .andWhere('o.status', '!=', 'cancelled')
    .andWhere('o.payment_status', 'paid')
    .groupBy('date')
    .orderBy('o.created_at', 'asc');

  res.status(200).json({
    success: true,
    data: chartData.map(item => ({
      date: item.date,
      gross_revenue: parseFloat(item.gross_revenue || 0),
      net_revenue: parseFloat(item.net_revenue || 0),
      orders_count: parseInt(item.orders_count || 0)
    }))
  });
});

/**
 * @desc    Obtenir les statistiques financières
 * @route   GET /api/vendor/finances/stats
 * @access  Private/Vendor
 */
exports.getFinanceStats = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;

  // Revenus du mois en cours
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthlyRevenue = await db('orders as o')
    .sum('o.total_amount as revenue')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId)
    .andWhere('o.created_at', '>=', currentMonth)
    .andWhere('o.status', '!=', 'cancelled')
    .andWhere('o.payment_status', 'paid')
    .first();

  // Revenus totaux
  const totalRevenue = await db('orders as o')
    .sum('o.total_amount as revenue')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId)
    .andWhere('o.status', '!=', 'cancelled')
    .andWhere('o.payment_status', 'paid')
    .first();

  // Total des retraits
  const totalPayouts = await db('vendor_payouts')
    .sum('amount as total')
    .where('vendor_id', vendorId)
    .andWhere('status', 'completed')
    .first();

  // Retraits en attente
  const pendingPayouts = await db('vendor_payouts')
    .count('* as count')
    .sum('amount as total')
    .where('vendor_id', vendorId)
    .andWhere('status', 'pending')
    .first();

  const total = parseFloat(totalRevenue.revenue || 0);
  const commission = total * 0.10;
  const net = total - commission;

  res.status(200).json({
    success: true,
    data: {
      monthly_revenue: parseFloat(monthlyRevenue.revenue || 0),
      total_revenue: total,
      total_commission: commission,
      total_net_revenue: net,
      total_payouts: parseFloat(totalPayouts.total || 0),
      available_balance: net - parseFloat(totalPayouts.total || 0),
      pending_payouts_count: parseInt(pendingPayouts.count || 0),
      pending_payouts_amount: parseFloat(pendingPayouts.total || 0),
      currency: 'XOF'
    }
  });
});
