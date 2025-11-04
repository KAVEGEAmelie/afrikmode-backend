const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');

/**
 * @desc    Get sales analytics
 * @route   GET /api/vendor/analytics/sales
 * @access  Private/Vendor
 */
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { dateFrom, dateTo, period = 'day' } = req.query;

    let query = db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('o.payment_status', 'paid');

    if (dateFrom) query = query.where('o.created_at', '>=', dateFrom);
    if (dateTo) query = query.where('o.created_at', '<=', dateTo);

    // Total sales
    const [{ total_sales, total_revenue }] = await query.clone()
      .countDistinct('o.id as total_sales')
      .sum('oi.subtotal as total_revenue');

    // Sales by period
    let dateFormat;
    switch (period) {
      case 'hour': dateFormat = 'DATE_FORMAT(o.created_at, "%Y-%m-%d %H:00")'; break;
      case 'day': dateFormat = 'DATE(o.created_at)'; break;
      case 'week': dateFormat = 'YEARWEEK(o.created_at)'; break;
      case 'month': dateFormat = 'DATE_FORMAT(o.created_at, "%Y-%m")'; break;
      default: dateFormat = 'DATE(o.created_at)';
    }

    const salesByPeriod = await query.clone()
      .select(db.raw(`${dateFormat} as period`))
      .countDistinct('o.id as sales')
      .sum('oi.subtotal as revenue')
      .groupBy(db.raw(dateFormat))
      .orderBy('period', 'asc');

    // Top selling products
    const topProducts = await query.clone()
      .select('p.id', 'p.name', 'p.image_url', 'p.price')
      .sum('oi.quantity as total_sold')
      .sum('oi.subtotal as revenue')
      .groupBy('p.id')
      .orderBy('total_sold', 'desc')
      .limit(10);

    // Sales by category
    const salesByCategory = await query.clone()
      .join('product_categories as pc', 'p.id', 'pc.product_id')
      .join('categories as c', 'pc.category_id', 'c.id')
      .select('c.id', 'c.name')
      .countDistinct('o.id as sales')
      .sum('oi.subtotal as revenue')
      .groupBy('c.id')
      .orderBy('revenue', 'desc');

    // Conversion rate (orders / views)
    const [{ total_views }] = await db('product_views')
      .join('products as p', 'product_views.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .count('* as total_views');

    const conversionRate = total_views > 0 ? (total_sales / total_views * 100).toFixed(2) : 0;

    successResponse(res, {
      total_sales: parseInt(total_sales) || 0,
      total_revenue: parseFloat(total_revenue) || 0,
      conversion_rate: parseFloat(conversionRate),
      sales_by_period: salesByPeriod,
      top_products: topProducts,
      sales_by_category: salesByCategory
    }, 'Sales analytics retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product performance
 * @route   GET /api/vendor/analytics/products
 * @access  Private/Vendor
 */
exports.getProductPerformance = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { sortBy = 'revenue', limit = 20 } = req.query;

    const products = await db('products as p')
      .leftJoin('order_items as oi', 'p.id', 'oi.product_id')
      .leftJoin('orders as o', function() {
        this.on('oi.order_id', '=', 'o.id')
            .andOn('o.payment_status', '=', db.raw('?', ['paid']));
      })
      .leftJoin('product_views as pv', 'p.id', 'pv.product_id')
      .leftJoin('product_favorites as pf', 'p.id', 'pf.product_id')
      .where('p.vendor_id', vendorId)
      .select(
        'p.id',
        'p.name',
        'p.image_url',
        'p.price',
        'p.stock_quantity',
        'p.status'
      )
      .count('DISTINCT pv.id as views')
      .count('DISTINCT pf.id as favorites')
      .sum('oi.quantity as units_sold')
      .sum('oi.subtotal as revenue')
      .groupBy('p.id')
      .orderBy(sortBy, 'desc')
      .limit(limit);

    // Add performance metrics
    const productsWithMetrics = products.map(product => ({
      ...product,
      views: parseInt(product.views) || 0,
      favorites: parseInt(product.favorites) || 0,
      units_sold: parseInt(product.units_sold) || 0,
      revenue: parseFloat(product.revenue) || 0,
      conversion_rate: product.views > 0 ? 
        ((product.units_sold / product.views) * 100).toFixed(2) : 0
    }));

    successResponse(res, { products: productsWithMetrics }, 'Product performance retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get customer insights
 * @route   GET /api/vendor/analytics/customers
 * @access  Private/Vendor
 */
exports.getCustomerInsights = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Total customers
    const [{ total_customers }] = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .countDistinct('o.customer_id as total_customers');

    // Repeat customers
    const repeatCustomers = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .select('o.customer_id')
      .countDistinct('o.id as order_count')
      .groupBy('o.customer_id')
      .having('order_count', '>', 1);

    // Top customers
    const topCustomers = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .join('users as u', 'o.customer_id', 'u.id')
      .where('p.vendor_id', vendorId)
      .where('o.payment_status', 'paid')
      .select(
        'u.id',
        'u.first_name',
        'u.last_name',
        'u.email'
      )
      .count('DISTINCT o.id as total_orders')
      .sum('oi.subtotal as total_spent')
      .groupBy('u.id')
      .orderBy('total_spent', 'desc')
      .limit(10);

    // Customer acquisition by month
    const acquisitionData = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .select(db.raw('DATE_FORMAT(MIN(o.created_at), "%Y-%m") as month'))
      .countDistinct('o.customer_id as new_customers')
      .groupBy('o.customer_id')
      .groupBy(db.raw('DATE_FORMAT(MIN(o.created_at), "%Y-%m")'))
      .orderBy('month', 'asc');

    successResponse(res, {
      total_customers: parseInt(total_customers) || 0,
      repeat_customers: repeatCustomers.length,
      repeat_rate: total_customers > 0 ? 
        ((repeatCustomers.length / total_customers) * 100).toFixed(2) : 0,
      top_customers: topCustomers,
      acquisition_data: acquisitionData
    }, 'Customer insights retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get traffic sources
 * @route   GET /api/vendor/analytics/traffic
 * @access  Private/Vendor
 */
exports.getTrafficSources = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Traffic by source
    const trafficSources = await db('product_views as pv')
      .join('products as p', 'pv.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .select('pv.source')
      .count('* as views')
      .groupBy('pv.source')
      .orderBy('views', 'desc');

    // Traffic by device
    const trafficByDevice = await db('product_views as pv')
      .join('products as p', 'pv.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .select('pv.device_type')
      .count('* as views')
      .groupBy('pv.device_type')
      .orderBy('views', 'desc');

    // Traffic trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trafficTrend = await db('product_views as pv')
      .join('products as p', 'pv.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('pv.created_at', '>=', thirtyDaysAgo)
      .select(db.raw('DATE(pv.created_at) as date'))
      .count('* as views')
      .groupBy(db.raw('DATE(pv.created_at)'))
      .orderBy('date', 'asc');

    successResponse(res, {
      traffic_sources: trafficSources,
      traffic_by_device: trafficByDevice,
      traffic_trend: trafficTrend
    }, 'Traffic sources retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get conversion rates
 * @route   GET /api/vendor/analytics/conversions
 * @access  Private/Vendor
 */
exports.getConversionRates = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Views to cart
    const [{ total_views }] = await db('product_views as pv')
      .join('products as p', 'pv.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .count('* as total_views');

    const [{ added_to_cart }] = await db('cart_items as ci')
      .join('products as p', 'ci.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .countDistinct('ci.id as added_to_cart');

    const viewToCartRate = total_views > 0 ? 
      ((added_to_cart / total_views) * 100).toFixed(2) : 0;

    // Cart to order
    const [{ total_orders }] = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .countDistinct('o.id as total_orders');

    const cartToOrderRate = added_to_cart > 0 ? 
      ((total_orders / added_to_cart) * 100).toFixed(2) : 0;

    // Overall conversion rate
    const overallRate = total_views > 0 ? 
      ((total_orders / total_views) * 100).toFixed(2) : 0;

    // Conversion funnel
    const funnel = [
      { step: 'Views', count: parseInt(total_views) || 0, rate: 100 },
      { step: 'Add to Cart', count: parseInt(added_to_cart) || 0, rate: parseFloat(viewToCartRate) },
      { step: 'Orders', count: parseInt(total_orders) || 0, rate: parseFloat(overallRate) }
    ];

    successResponse(res, {
      view_to_cart_rate: parseFloat(viewToCartRate),
      cart_to_order_rate: parseFloat(cartToOrderRate),
      overall_conversion_rate: parseFloat(overallRate),
      funnel
    }, 'Conversion rates retrieved successfully');

  } catch (error) {
    next(error);
  }
};
