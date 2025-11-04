const db = require('../config/database');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @desc    Get sales analytics
 * @route   GET /api/vendor/analytics/sales
 * @access  Private (Vendor)
 */
exports.getSalesAnalytics = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d' } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Total sales
  const totalSales = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .sum('order_items.quantity * order_items.price as total')
    .countDistinct('orders.id as orders_count')
    .sum('order_items.quantity as units_sold')
    .first();

  // Sales by category
  const salesByCategory = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .join('categories', 'products.category_id', 'categories.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .select('categories.name as category')
    .sum('order_items.quantity * order_items.price as revenue')
    .sum('order_items.quantity as units')
    .groupBy('categories.id', 'categories.name')
    .orderBy('revenue', 'desc');

  // Sales trend (daily)
  const salesTrend = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .select(db.raw('DATE(orders.created_at) as date'))
    .sum('order_items.quantity * order_items.price as revenue')
    .countDistinct('orders.id as orders')
    .groupBy('date')
    .orderBy('date', 'asc');

  // Compare with previous period
  const previousDateFrom = new Date(dateFrom);
  previousDateFrom.setDate(previousDateFrom.getDate() - daysAgo);
  
  const previousSales = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', previousDateFrom)
    .where('orders.created_at', '<', dateFrom)
    .sum('order_items.quantity * order_items.price as total')
    .first();

  const growthRate = previousSales.total > 0 
    ? ((totalSales.total - previousSales.total) / previousSales.total * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalRevenue: totalSales.total || 0,
        totalOrders: totalSales.orders_count || 0,
        unitsSold: totalSales.units_sold || 0,
        averageOrderValue: totalSales.orders_count > 0 
          ? (totalSales.total / totalSales.orders_count).toFixed(2)
          : 0,
        growthRate: parseFloat(growthRate)
      },
      salesByCategory,
      salesTrend,
      period
    }
  });
});

/**
 * @desc    Get product performance analytics
 * @route   GET /api/vendor/analytics/products
 * @access  Private (Vendor)
 */
exports.getProductPerformance = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d', limit = 10 } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Top selling products
  const topProducts = await db('order_items')
    .join('orders', 'order_items.order_id', 'orders.id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .select(
      'products.id',
      'products.name',
      'products.main_image',
      'products.price'
    )
    .sum('order_items.quantity as units_sold')
    .sum('order_items.quantity * order_items.price as revenue')
    .countDistinct('orders.id as orders_count')
    .groupBy('products.id')
    .orderBy('revenue', 'desc')
    .limit(limit);

  // Low performing products
  const lowPerformingProducts = await db('products')
    .leftJoin('order_items', function() {
      this.on('products.id', '=', 'order_items.product_id')
        .andOn(db.raw('order_items.created_at >= ?', [dateFrom]));
    })
    .where('products.vendor_id', vendorId)
    .where('products.status', 'active')
    .select(
      'products.id',
      'products.name',
      'products.main_image',
      'products.price',
      'products.stock_quantity'
    )
    .sum('order_items.quantity as units_sold')
    .groupBy('products.id')
    .having('units_sold', '<', 5)
    .orHavingNull('units_sold')
    .orderBy('units_sold', 'asc')
    .limit(limit);

  // Products by conversion rate (views to sales)
  const productConversion = await db('products')
    .leftJoin('product_views', 'products.id', 'product_views.product_id')
    .leftJoin('order_items', function() {
      this.on('products.id', '=', 'order_items.product_id')
        .andOn(db.raw('order_items.created_at >= ?', [dateFrom]));
    })
    .where('products.vendor_id', vendorId)
    .where('product_views.created_at', '>=', dateFrom)
    .select(
      'products.id',
      'products.name'
    )
    .count('DISTINCT product_views.id as views')
    .count('DISTINCT order_items.id as sales')
    .groupBy('products.id')
    .havingRaw('COUNT(DISTINCT product_views.id) > 0')
    .orderByRaw('(COUNT(DISTINCT order_items.id) / COUNT(DISTINCT product_views.id)) DESC')
    .limit(limit);

  res.json({
    success: true,
    data: {
      topProducts,
      lowPerformingProducts,
      productConversion,
      period
    }
  });
});

/**
 * @desc    Get customer insights
 * @route   GET /api/vendor/analytics/customers
 * @access  Private (Vendor)
 */
exports.getCustomerInsights = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d' } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Total unique customers
  const uniqueCustomers = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .countDistinct('orders.customer_id as count')
    .first();

  // New vs returning customers
  const customerSegments = await db.raw(`
    SELECT 
      CASE 
        WHEN order_count = 1 THEN 'new'
        ELSE 'returning'
      END as segment,
      COUNT(*) as count,
      SUM(total_spent) as revenue
    FROM (
      SELECT 
        orders.customer_id,
        COUNT(DISTINCT orders.id) as order_count,
        SUM(order_items.quantity * order_items.price) as total_spent
      FROM orders
      JOIN order_items ON orders.id = order_items.order_id
      JOIN products ON order_items.product_id = products.id
      WHERE products.vendor_id = ?
        AND orders.created_at >= ?
      GROUP BY orders.customer_id
    ) as customer_stats
    GROUP BY segment
  `, [vendorId, dateFrom]);

  // Top customers
  const topCustomers = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .join('users', 'orders.customer_id', 'users.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .select(
      'users.id',
      'users.first_name',
      'users.last_name',
      'users.email'
    )
    .countDistinct('orders.id as orders_count')
    .sum('order_items.quantity * order_items.price as total_spent')
    .groupBy('users.id')
    .orderBy('total_spent', 'desc')
    .limit(10);

  // Customer acquisition trend
  const acquisitionTrend = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .select(db.raw('DATE(orders.created_at) as date'))
    .countDistinct('orders.customer_id as new_customers')
    .groupBy('date')
    .orderBy('date', 'asc');

  // Average customer lifetime value
  const avgLifetimeValue = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .select(db.raw('AVG(customer_total) as avg_ltv'))
    .from(db.raw(`(
      SELECT 
        orders.customer_id,
        SUM(order_items.quantity * order_items.price) as customer_total
      FROM orders
      JOIN order_items ON orders.id = order_items.order_id
      JOIN products ON order_items.product_id = products.id
      WHERE products.vendor_id = ?
      GROUP BY orders.customer_id
    ) as ltv_calc`, [vendorId]))
    .first();

  res.json({
    success: true,
    data: {
      totalUniqueCustomers: uniqueCustomers.count || 0,
      customerSegments: customerSegments[0] || [],
      topCustomers,
      acquisitionTrend,
      averageLifetimeValue: avgLifetimeValue.avg_ltv || 0,
      period
    }
  });
});

/**
 * @desc    Get traffic sources
 * @route   GET /api/vendor/analytics/traffic
 * @access  Private (Vendor)
 */
exports.getTrafficSources = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d' } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Page views by source
  const trafficSources = await db('vendor_page_views')
    .where('vendor_id', vendorId)
    .where('created_at', '>=', dateFrom)
    .select('source')
    .count('* as views')
    .countDistinct('session_id as sessions')
    .countDistinct('user_id as unique_visitors')
    .groupBy('source')
    .orderBy('views', 'desc');

  // Device breakdown
  const deviceBreakdown = await db('vendor_page_views')
    .where('vendor_id', vendorId)
    .where('created_at', '>=', dateFrom)
    .select('device_type')
    .count('* as views')
    .groupBy('device_type')
    .orderBy('views', 'desc');

  // Geographic data
  const geographicData = await db('vendor_page_views')
    .where('vendor_id', vendorId)
    .where('created_at', '>=', dateFrom)
    .select('country', 'city')
    .count('* as views')
    .groupBy('country', 'city')
    .orderBy('views', 'desc')
    .limit(20);

  // Traffic trend
  const trafficTrend = await db('vendor_page_views')
    .where('vendor_id', vendorId)
    .where('created_at', '>=', dateFrom)
    .select(db.raw('DATE(created_at) as date'))
    .count('* as views')
    .countDistinct('session_id as sessions')
    .groupBy('date')
    .orderBy('date', 'asc');

  res.json({
    success: true,
    data: {
      trafficSources,
      deviceBreakdown,
      geographicData,
      trafficTrend,
      period
    }
  });
});

/**
 * @desc    Get conversion rates
 * @route   GET /api/vendor/analytics/conversion
 * @access  Private (Vendor)
 */
exports.getConversionRates = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d' } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Overall conversion funnel
  const totalViews = await db('vendor_page_views')
    .where('vendor_id', vendorId)
    .where('created_at', '>=', dateFrom)
    .count('* as count')
    .first();

  const addedToCart = await db('cart_items')
    .join('products', 'cart_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('cart_items.created_at', '>=', dateFrom)
    .countDistinct('cart_items.cart_id as count')
    .first();

  const purchases = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.created_at', '>=', dateFrom)
    .countDistinct('orders.id as count')
    .first();

  const views = totalViews.count || 1; // Avoid division by zero
  const carts = addedToCart.count || 0;
  const orders = purchases.count || 0;

  const conversionFunnel = {
    views: views,
    addedToCart: carts,
    purchases: orders,
    viewToCartRate: ((carts / views) * 100).toFixed(2),
    cartToPurchaseRate: carts > 0 ? ((orders / carts) * 100).toFixed(2) : '0.00',
    overallConversionRate: ((orders / views) * 100).toFixed(2)
  };

  // Conversion by source
  const conversionBySource = await db('vendor_page_views')
    .leftJoin('orders', function() {
      this.on('vendor_page_views.session_id', '=', 'orders.session_id')
        .andOn('orders.created_at', '>=', dateFrom);
    })
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('vendor_page_views.vendor_id', vendorId)
    .where('products.vendor_id', vendorId)
    .where('vendor_page_views.created_at', '>=', dateFrom)
    .select('vendor_page_views.source')
    .count('DISTINCT vendor_page_views.session_id as sessions')
    .count('DISTINCT orders.id as conversions')
    .groupBy('vendor_page_views.source');

  res.json({
    success: true,
    data: {
      conversionFunnel,
      conversionBySource,
      period
    }
  });
});

/**
 * @desc    Get analytics dashboard summary
 * @route   GET /api/vendor/analytics/dashboard
 * @access  Private (Vendor)
 */
exports.getAnalyticsDashboard = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { period = '30d' } = req.query;

  const periods = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const daysAgo = periods[period] || 30;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysAgo);

  // Key metrics
  const [revenue, orders, customers, views] = await Promise.all([
    // Total revenue
    db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .join('products', 'order_items.product_id', 'products.id')
      .where('products.vendor_id', vendorId)
      .where('orders.created_at', '>=', dateFrom)
      .sum('order_items.quantity * order_items.price as total')
      .first(),
    
    // Total orders
    db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .join('products', 'order_items.product_id', 'products.id')
      .where('products.vendor_id', vendorId)
      .where('orders.created_at', '>=', dateFrom)
      .countDistinct('orders.id as count')
      .first(),
    
    // Unique customers
    db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .join('products', 'order_items.product_id', 'products.id')
      .where('products.vendor_id', vendorId)
      .where('orders.created_at', '>=', dateFrom)
      .countDistinct('orders.customer_id as count')
      .first(),
    
    // Page views
    db('vendor_page_views')
      .where('vendor_id', vendorId)
      .where('created_at', '>=', dateFrom)
      .count('* as count')
      .first()
  ]);

  res.json({
    success: true,
    data: {
      totalRevenue: revenue.total || 0,
      totalOrders: orders.count || 0,
      uniqueCustomers: customers.count || 0,
      pageViews: views.count || 0,
      averageOrderValue: orders.count > 0 ? (revenue.total / orders.count).toFixed(2) : 0,
      conversionRate: views.count > 0 ? ((orders.count / views.count) * 100).toFixed(2) : 0,
      period
    }
  });
});
