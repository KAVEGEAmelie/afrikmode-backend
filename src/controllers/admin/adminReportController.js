const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get all reports
 * @route   GET /api/admin/reports
 * @access  Private/Admin
 */
exports.getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, report_type } = req.query;
    const offset = (page - 1) * limit;

    let query = db('generated_reports as gr')
      .leftJoin('users as u', 'gr.generated_by', 'u.id')
      .select(
        'gr.id',
        'gr.report_type',
        'gr.title',
        'gr.file_path',
        'gr.format',
        'gr.status',
        'gr.created_at',
        'u.first_name',
        'u.last_name'
      );

    if (report_type) query = query.where('gr.report_type', report_type);

    const [{ count: total }] = await query.clone().count('gr.id as count');
    const reports = await query
      .orderBy('gr.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse filters
    reports.forEach(r => {
      if (r.filters) r.filters = JSON.parse(r.filters);
    });

    successResponse(res, {
      reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Reports retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate activity report
 * @route   POST /api/admin/reports/activity
 * @access  Private/Admin
 */
exports.generateActivityReport = async (req, res, next) => {
  try {
    const { start_date, end_date, format = 'pdf' } = req.body;

    // Gather activity data
    const [{ new_users }] = await db('users')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date)
      .count('* as new_users');

    const [{ new_vendors }] = await db('vendors')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date)
      .count('* as new_vendors');

    const [{ new_products }] = await db('products')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date)
      .count('* as new_products');

    const [{ total_orders }] = await db('orders')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date)
      .count('* as total_orders');

    const [{ total_revenue }] = await db('transactions')
      .where('status', 'completed')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date)
      .sum('amount as total_revenue');

    const reportData = {
      period: { start_date, end_date },
      new_users: parseInt(new_users) || 0,
      new_vendors: parseInt(new_vendors) || 0,
      new_products: parseInt(new_products) || 0,
      total_orders: parseInt(total_orders) || 0,
      total_revenue: parseFloat(total_revenue) || 0
    };

    // Mock file generation
    const fileName = `activity_report_${Date.now()}.${format}`;
    const filePath = `/reports/${fileName}`;

    // Save report record
    const [reportId] = await db('generated_reports').insert({
      report_type: 'activity',
      title: `Rapport d'activité ${start_date} - ${end_date}`,
      file_path: filePath,
      format,
      filters: JSON.stringify({ start_date, end_date }),
      generated_by: req.user.id,
      status: 'completed',
      created_at: db.fn.now()
    });

    successResponse(res, {
      report_id: reportId,
      file_path: filePath,
      data: reportData
    }, 'Activity report generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate transaction report
 * @route   POST /api/admin/reports/transactions
 * @access  Private/Admin
 */
exports.generateTransactionReport = async (req, res, next) => {
  try {
    const { start_date, end_date, payment_method, format = 'pdf' } = req.body;

    let query = db('transactions')
      .where('created_at', '>=', start_date)
      .where('created_at', '<=', end_date);

    if (payment_method) query = query.where('payment_method', payment_method);

    const [{ total_transactions }] = await query.clone().count('* as total_transactions');
    const [{ total_volume }] = await query.clone().sum('amount as total_volume');

    const statusBreakdown = await query.clone()
      .select('status')
      .count('* as count')
      .sum('amount as amount')
      .groupBy('status');

    const reportData = {
      period: { start_date, end_date },
      total_transactions: parseInt(total_transactions) || 0,
      total_volume: parseFloat(total_volume) || 0,
      status_breakdown: statusBreakdown
    };

    const fileName = `transaction_report_${Date.now()}.${format}`;
    const filePath = `/reports/${fileName}`;

    const [reportId] = await db('generated_reports').insert({
      report_type: 'transactions',
      title: `Rapport des transactions ${start_date} - ${end_date}`,
      file_path: filePath,
      format,
      filters: JSON.stringify({ start_date, end_date, payment_method }),
      generated_by: req.user.id,
      status: 'completed',
      created_at: db.fn.now()
    });

    successResponse(res, {
      report_id: reportId,
      file_path: filePath,
      data: reportData
    }, 'Transaction report generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate vendor report
 * @route   POST /api/admin/reports/vendors
 * @access  Private/Admin
 */
exports.generateVendorReport = async (req, res, next) => {
  try {
    const { start_date, end_date, format = 'pdf' } = req.body;

    const vendors = await db('vendors as v')
      .leftJoin(
        db('products').count('* as products_count').select('vendor_id').groupBy('vendor_id').as('p'),
        'v.id', 'p.vendor_id'
      )
      .leftJoin(
        db('orders').count('* as orders_count').sum('total_amount as revenue').select('vendor_id').where('created_at', '>=', start_date).where('created_at', '<=', end_date).groupBy('vendor_id').as('o'),
        'v.id', 'o.vendor_id'
      )
      .select(
        'v.id',
        'v.business_name',
        'v.status',
        'v.subscription_plan',
        db.raw('COALESCE(p.products_count, 0) as products_count'),
        db.raw('COALESCE(o.orders_count, 0) as orders_count'),
        db.raw('COALESCE(o.revenue, 0) as revenue')
      )
      .orderBy('revenue', 'desc');

    const fileName = `vendor_report_${Date.now()}.${format}`;
    const filePath = `/reports/${fileName}`;

    const [reportId] = await db('generated_reports').insert({
      report_type: 'vendors',
      title: `Rapport des vendeurs ${start_date} - ${end_date}`,
      file_path: filePath,
      format,
      filters: JSON.stringify({ start_date, end_date }),
      generated_by: req.user.id,
      status: 'completed',
      created_at: db.fn.now()
    });

    successResponse(res, {
      report_id: reportId,
      file_path: filePath,
      data: { vendors }
    }, 'Vendor report generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate custom report
 * @route   POST /api/admin/reports/custom
 * @access  Private/Admin
 */
exports.generateCustomReport = async (req, res, next) => {
  try {
    const { title, metrics, filters, format = 'pdf' } = req.body;

    const fileName = `custom_report_${Date.now()}.${format}`;
    const filePath = `/reports/${fileName}`;

    const [reportId] = await db('generated_reports').insert({
      report_type: 'custom',
      title,
      file_path: filePath,
      format,
      filters: JSON.stringify(filters),
      generated_by: req.user.id,
      status: 'completed',
      created_at: db.fn.now()
    });

    successResponse(res, {
      report_id: reportId,
      file_path: filePath
    }, 'Custom report generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download report
 * @route   GET /api/admin/reports/:id/download
 * @access  Private/Admin
 */
exports.downloadReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await db('generated_reports').where('id', id).first();
    if (!report) throw new AppError('Report not found', 404);

    successResponse(res, {
      file_path: report.file_path,
      file_name: report.file_path.split('/').pop()
    }, 'Report download link retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Schedule report
 * @route   POST /api/admin/reports/schedule
 * @access  Private/Admin
 */
exports.scheduleReport = async (req, res, next) => {
  try {
    const { report_type, frequency, filters, recipients } = req.body;

    const [scheduleId] = await db('scheduled_reports').insert({
      report_type,
      frequency, // 'daily', 'weekly', 'monthly'
      filters: JSON.stringify(filters),
      recipients: JSON.stringify(recipients),
      created_by: req.user.id,
      is_active: true,
      created_at: db.fn.now()
    });

    successResponse(res, { schedule_id: scheduleId }, 'Report scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get report types
 * @route   GET /api/admin/reports/types
 * @access  Private/Admin
 */
exports.getReportTypes = async (req, res, next) => {
  try {
    const types = [
      { value: 'activity', label: 'Rapport d\'activité', icon: 'chart-line' },
      { value: 'transactions', label: 'Rapport des transactions', icon: 'receipt' },
      { value: 'vendors', label: 'Rapport des vendeurs', icon: 'store' },
      { value: 'sales', label: 'Rapport des ventes', icon: 'shopping-cart' },
      { value: 'inventory', label: 'Rapport d\'inventaire', icon: 'boxes' },
      { value: 'custom', label: 'Rapport personnalisé', icon: 'file-alt' }
    ];

    successResponse(res, { types }, 'Report types retrieved successfully');
  } catch (error) {
    next(error);
  }
};
