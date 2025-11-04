const db = require('../config/database');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @desc    Get vendor orders with filters
 * @route   GET /api/vendor/orders
 * @access  Private (Vendor)
 */
exports.getVendorOrders = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { 
    page = 1, 
    limit = 20, 
    status, 
    search,
    dateFrom,
    dateTo,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  let query = db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .select(
      'orders.id',
      'orders.order_number',
      'orders.customer_id',
      'orders.total_amount',
      'orders.status',
      'orders.payment_status',
      'orders.payment_method',
      'orders.shipping_address',
      'orders.created_at',
      db.raw('COUNT(DISTINCT order_items.id) as items_count'),
      db.raw('SUM(order_items.quantity * order_items.price) as vendor_total')
    )
    .groupBy('orders.id');

  // Filters
  if (status) {
    query = query.where('orders.status', status);
  }

  if (search) {
    query = query.where(function() {
      this.where('orders.order_number', 'like', `%${search}%`)
        .orWhere('orders.customer_email', 'like', `%${search}%`);
    });
  }

  if (dateFrom) {
    query = query.where('orders.created_at', '>=', dateFrom);
  }

  if (dateTo) {
    query = query.where('orders.created_at', '<=', dateTo);
  }

  // Get total count
  const countQuery = query.clone();
  const totalCount = await countQuery.count('* as count').first();

  // Pagination and sorting
  const orders = await query
    .orderBy(sortBy, sortOrder)
    .limit(limit)
    .offset(offset);

  // Get customer details for each order
  const ordersWithDetails = await Promise.all(
    orders.map(async (order) => {
      const customer = await db('users')
        .where('id', order.customer_id)
        .select('first_name', 'last_name', 'email', 'phone')
        .first();

      return {
        ...order,
        customer: customer || null,
        shipping_address: JSON.parse(order.shipping_address || '{}')
      };
    })
  );

  res.json({
    success: true,
    data: {
      orders: ordersWithDetails,
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
 * @desc    Get single vendor order by ID
 * @route   GET /api/vendor/orders/:id
 * @access  Private (Vendor)
 */
exports.getVendorOrderById = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { id } = req.params;

  // Get order
  const order = await db('orders')
    .where('orders.id', id)
    .select('*')
    .first();

  if (!order) {
    throw new AppError('Commande non trouvée', 404);
  }

  // Verify vendor owns products in this order
  const vendorItems = await db('order_items')
    .join('products', 'order_items.product_id', 'products.id')
    .where('order_items.order_id', id)
    .where('products.vendor_id', vendorId)
    .select(
      'order_items.*',
      'products.name',
      'products.main_image',
      'products.sku'
    );

  if (vendorItems.length === 0) {
    throw new AppError('Vous n\'avez pas accès à cette commande', 403);
  }

  // Get customer details
  const customer = await db('users')
    .where('id', order.customer_id)
    .select('id', 'first_name', 'last_name', 'email', 'phone')
    .first();

  // Get order timeline
  const timeline = await db('order_status_history')
    .where('order_id', id)
    .orderBy('created_at', 'asc')
    .select('*');

  res.json({
    success: true,
    data: {
      ...order,
      shipping_address: JSON.parse(order.shipping_address || '{}'),
      billing_address: JSON.parse(order.billing_address || '{}'),
      customer,
      items: vendorItems,
      timeline
    }
  });
});

/**
 * @desc    Update order status
 * @route   PATCH /api/vendor/orders/:id/status
 * @access  Private (Vendor)
 */
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    throw new AppError('Statut invalide', 400);
  }

  // Verify vendor owns products in this order
  const vendorItems = await db('order_items')
    .join('products', 'order_items.product_id', 'products.id')
    .where('order_items.order_id', id)
    .where('products.vendor_id', vendorId)
    .select('order_items.id');

  if (vendorItems.length === 0) {
    throw new AppError('Vous n\'avez pas accès à cette commande', 403);
  }

  // Update order status
  await db('orders')
    .where('id', id)
    .update({
      status,
      updated_at: db.fn.now()
    });

  // Add to status history
  await db('order_status_history').insert({
    order_id: id,
    status,
    note: note || null,
    changed_by: req.user.id,
    created_at: db.fn.now()
  });

  // Send notification to customer
  const order = await db('orders').where('id', id).first();
  
  // TODO: Send email/SMS notification
  // await notificationService.sendOrderStatusUpdate(order.customer_id, { orderId: id, status });

  res.json({
    success: true,
    message: 'Statut de la commande mis à jour',
    data: { status }
  });
});

/**
 * @desc    Mark order as shipped
 * @route   POST /api/vendor/orders/:id/mark-shipped
 * @access  Private (Vendor)
 */
exports.markOrderAsShipped = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { id } = req.params;
  const { carrier, tracking_number, estimated_delivery } = req.body;

  // Verify vendor owns products in this order
  const vendorItems = await db('order_items')
    .join('products', 'order_items.product_id', 'products.id')
    .where('order_items.order_id', id)
    .where('products.vendor_id', vendorId)
    .select('order_items.id');

  if (vendorItems.length === 0) {
    throw new AppError('Vous n\'avez pas accès à cette commande', 403);
  }

  // Update order
  await db('orders')
    .where('id', id)
    .update({
      status: 'shipped',
      carrier,
      tracking_number,
      estimated_delivery,
      shipped_at: db.fn.now(),
      updated_at: db.fn.now()
    });

  // Add to status history
  await db('order_status_history').insert({
    order_id: id,
    status: 'shipped',
    note: `Expédié via ${carrier} - Tracking: ${tracking_number}`,
    changed_by: req.user.id,
    created_at: db.fn.now()
  });

  // Get order details for notification
  const order = await db('orders').where('id', id).first();

  // TODO: Send tracking email to customer
  // await emailService.sendShippingConfirmation(order.customer_id, {
  //   orderId: id,
  //   carrier,
  //   trackingNumber: tracking_number
  // });

  res.json({
    success: true,
    message: 'Commande marquée comme expédiée',
    data: {
      status: 'shipped',
      carrier,
      tracking_number,
      estimated_delivery
    }
  });
});

/**
 * @desc    Get vendor orders stats
 * @route   GET /api/vendor/orders/stats
 * @access  Private (Vendor)
 */
exports.getVendorOrdersStats = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { dateFrom, dateTo } = req.query;

  let dateFilter = db.raw('1=1');
  if (dateFrom && dateTo) {
    dateFilter = db.raw('orders.created_at BETWEEN ? AND ?', [dateFrom, dateTo]);
  }

  // Total orders
  const totalOrders = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .whereRaw(dateFilter)
    .countDistinct('orders.id as count')
    .first();

  // Orders by status
  const ordersByStatus = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .whereRaw(dateFilter)
    .select('orders.status')
    .countDistinct('orders.id as count')
    .groupBy('orders.status');

  // Total revenue
  const revenue = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .where('orders.payment_status', 'paid')
    .whereRaw(dateFilter)
    .sum('order_items.quantity * order_items.price as total')
    .first();

  // Average order value
  const avgOrderValue = await db('orders')
    .join('order_items', 'orders.id', 'order_items.order_id')
    .join('products', 'order_items.product_id', 'products.id')
    .where('products.vendor_id', vendorId)
    .whereRaw(dateFilter)
    .select(db.raw('AVG(order_items.quantity * order_items.price) as average'))
    .first();

  res.json({
    success: true,
    data: {
      totalOrders: totalOrders.count || 0,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {}),
      totalRevenue: revenue.total || 0,
      averageOrderValue: avgOrderValue.average || 0
    }
  });
});

/**
 * @desc    Print order invoice
 * @route   GET /api/vendor/orders/:id/invoice
 * @access  Private (Vendor)
 */
exports.printOrderInvoice = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { id } = req.params;

  // Verify vendor owns products in this order
  const vendorItems = await db('order_items')
    .join('products', 'order_items.product_id', 'products.id')
    .where('order_items.order_id', id)
    .where('products.vendor_id', vendorId)
    .select('order_items.*', 'products.name');

  if (vendorItems.length === 0) {
    throw new AppError('Vous n\'avez pas accès à cette commande', 403);
  }

  // Get order details
  const order = await db('orders').where('id', id).first();
  const vendor = await db('vendors').where('id', vendorId).first();
  const customer = await db('users').where('id', order.customer_id).first();

  // TODO: Generate PDF invoice
  // const pdfBuffer = await pdfService.generateInvoice({
  //   order,
  //   vendor,
  //   customer,
  //   items: vendorItems
  // });

  res.json({
    success: true,
    message: 'Facture générée',
    data: {
      invoiceUrl: `/invoices/${order.order_number}.pdf` // Mock URL
    }
  });
});

/**
 * @desc    Bulk update orders status
 * @route   POST /api/vendor/orders/bulk-update
 * @access  Private (Vendor)
 */
exports.bulkUpdateOrdersStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendorId;
  const { orderIds, status } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new AppError('Liste de commandes invalide', 400);
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    throw new AppError('Statut invalide', 400);
  }

  // Verify vendor owns products in all orders
  const vendorOrders = await db('order_items')
    .join('products', 'order_items.product_id', 'products.id')
    .whereIn('order_items.order_id', orderIds)
    .where('products.vendor_id', vendorId)
    .distinct('order_items.order_id');

  const authorizedOrderIds = vendorOrders.map(o => o.order_id);

  if (authorizedOrderIds.length !== orderIds.length) {
    throw new AppError('Certaines commandes ne vous appartiennent pas', 403);
  }

  // Update orders
  await db('orders')
    .whereIn('id', authorizedOrderIds)
    .update({
      status,
      updated_at: db.fn.now()
    });

  // Add to status history for each order
  const historyRecords = authorizedOrderIds.map(orderId => ({
    order_id: orderId,
    status,
    note: 'Mise à jour groupée',
    changed_by: req.user.id,
    created_at: db.fn.now()
  }));

  await db('order_status_history').insert(historyRecords);

  res.json({
    success: true,
    message: `${authorizedOrderIds.length} commande(s) mise(s) à jour`,
    data: {
      updatedCount: authorizedOrderIds.length,
      status
    }
  });
});
