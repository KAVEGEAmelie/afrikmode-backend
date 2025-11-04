const db = require('../../config/database');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get vendor orders
 * @route   GET /api/vendor/orders
 * @access  Private/Vendor
 */
exports.getVendorOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
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

    let query = db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .select(
        'o.id',
        'o.order_number',
        'o.customer_id',
        'o.status',
        'o.payment_status',
        'o.total_amount',
        'o.created_at',
        db.raw('COUNT(DISTINCT oi.id) as items_count'),
        db.raw('SUM(oi.quantity) as total_items')
      )
      .groupBy('o.id');

    // Filters
    if (status) {
      query = query.where('o.status', status);
    }

    if (search) {
      query = query.where(function() {
        this.where('o.order_number', 'like', `%${search}%`)
            .orWhere('o.customer_name', 'like', `%${search}%`)
            .orWhere('o.customer_email', 'like', `%${search}%`);
      });
    }

    if (dateFrom) {
      query = query.where('o.created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('o.created_at', '<=', dateTo);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count: total }] = await totalQuery.count('* as count');

    // Apply sorting and pagination
    const orders = await query
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    // Get customer info for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const customer = await db('users')
          .where('id', order.user_id)
          .select('id', 'first_name', 'last_name', 'email', 'phone')
          .first();

        const items = await db('order_items as oi')
          .join('products as p', 'oi.product_id', 'p.id')
          .where('oi.order_id', order.id)
          .where('p.vendor_id', vendorId)
          .select(
            'oi.id',
            'oi.product_id',
            'p.name as product_name',
            'p.image_url',
            'oi.quantity',
            'oi.price',
            'oi.subtotal'
          );

        return {
          ...order,
          customer,
          items
        };
      })
    );

    successResponse(res, {
      orders: ordersWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    }, 'Orders retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single vendor order
 * @route   GET /api/vendor/orders/:id
 * @access  Private/Vendor
 */
exports.getVendorOrder = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const order = await db('orders')
      .where('id', id)
      .first();

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Verify this order has items from this vendor
    const vendorItems = await db('order_items as oi')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('oi.order_id', id)
      .where('p.vendor_id', vendorId)
      .select('oi.*');

    if (vendorItems.length === 0) {
      throw new AppError('You do not have access to this order', 403);
    }

    // Get customer details
    const customer = await db('users')
      .where('id', order.user_id)
      .select('id', 'first_name', 'last_name', 'email', 'phone')
      .first();

    // Get shipping address
    const shippingAddress = await db('order_addresses')
      .where('order_id', id)
      .where('type', 'shipping')
      .first();

    // Get all items (only vendor's products)
    const items = await db('order_items as oi')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('oi.order_id', id)
      .where('p.vendor_id', vendorId)
      .select(
        'oi.*',
        'p.name as product_name',
        'p.image_url',
        'p.sku'
      );

    // Get order timeline
    const timeline = await db('order_status_history')
      .where('order_id', id)
      .orderBy('created_at', 'desc')
      .select('*');

    successResponse(res, {
      order: {
        ...order,
        customer,
        shipping_address: shippingAddress,
        items,
        timeline
      }
    }, 'Order retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PATCH /api/vendor/orders/:id/status
 * @access  Private/Vendor
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { status, notes } = req.body;

    // Verify vendor has access to this order
    const vendorItems = await db('order_items as oi')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('oi.order_id', id)
      .where('p.vendor_id', vendorId)
      .first();

    if (!vendorItems) {
      throw new AppError('You do not have access to this order', 403);
    }

    // Valid status transitions
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid order status', 400);
    }

    await db.transaction(async (trx) => {
      // Update order status
      await trx('orders')
        .where('id', id)
        .update({
          status,
          updated_at: db.fn.now()
        });

      // Add to status history
      await trx('order_status_history').insert({
        order_id: id,
        status,
        notes,
        changed_by: req.user.id,
        created_at: db.fn.now()
      });

      // If shipped, update shipped_at
      if (status === 'shipped') {
        await trx('orders')
          .where('id', id)
          .update({ shipped_at: db.fn.now() });
      }

      // If delivered, update delivered_at
      if (status === 'delivered') {
        await trx('orders')
          .where('id', id)
          .update({ delivered_at: db.fn.now() });
      }
    });

    const updatedOrder = await db('orders')
      .where('id', id)
      .first();

    successResponse(res, { order: updatedOrder }, 'Order status updated successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark order as shipped
 * @route   POST /api/vendor/orders/:id/ship
 * @access  Private/Vendor
 */
exports.markAsShipped = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { tracking_number, carrier, notes } = req.body;

    // Verify vendor has access to this order
    const vendorItems = await db('order_items as oi')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('oi.order_id', id)
      .where('p.vendor_id', vendorId)
      .first();

    if (!vendorItems) {
      throw new AppError('You do not have access to this order', 403);
    }

    await db.transaction(async (trx) => {
      // Update order
      await trx('orders')
        .where('id', id)
        .update({
          status: 'shipped',
          tracking_number,
          carrier,
          shipped_at: db.fn.now(),
          updated_at: db.fn.now()
        });

      // Add to status history
      await trx('order_status_history').insert({
        order_id: id,
        status: 'shipped',
        notes: notes || `Shipped via ${carrier}. Tracking: ${tracking_number}`,
        changed_by: req.user.id,
        created_at: db.fn.now()
      });
    });

    const updatedOrder = await db('orders')
      .where('id', id)
      .first();

    successResponse(res, { order: updatedOrder }, 'Order marked as shipped successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor orders statistics
 * @route   GET /api/vendor/orders/stats
 * @access  Private/Vendor
 */
exports.getOrdersStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { dateFrom, dateTo } = req.query;

    let query = db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId);

    if (dateFrom) {
      query = query.where('o.created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('o.created_at', '<=', dateTo);
    }

    // Total orders
    const [{ total_orders }] = await query.clone()
      .countDistinct('o.id as total_orders');

    // Orders by status
    const ordersByStatus = await query.clone()
      .select('o.status')
      .countDistinct('o.id as count')
      .groupBy('o.status');

    // Total revenue
    const [{ total_revenue }] = await query.clone()
      .sum('oi.subtotal as total_revenue');

    // Average order value
    const avgOrderValue = total_revenue / total_orders || 0;

    // Recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [{ recent_orders }] = await db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .where('o.created_at', '>=', sevenDaysAgo)
      .countDistinct('o.id as recent_orders');

    successResponse(res, {
      total_orders: parseInt(total_orders) || 0,
      orders_by_status: ordersByStatus,
      total_revenue: parseFloat(total_revenue) || 0,
      average_order_value: parseFloat(avgOrderValue.toFixed(2)),
      recent_orders: parseInt(recent_orders) || 0
    }, 'Orders statistics retrieved successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export vendor orders
 * @route   GET /api/vendor/orders/export
 * @access  Private/Vendor
 */
exports.exportOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { format = 'csv', status, dateFrom, dateTo } = req.query;

    let query = db('orders as o')
      .join('order_items as oi', 'o.id', 'oi.order_id')
      .join('products as p', 'oi.product_id', 'p.id')
      .where('p.vendor_id', vendorId)
      .select(
        'o.id',
        'o.order_number',
        'o.status',
        'o.total_amount',
        'o.created_at',
        'oi.product_id',
        'p.name as product_name',
        'oi.quantity',
        'oi.price',
        'oi.subtotal'
      );

    if (status) {
      query = query.where('o.status', status);
    }

    if (dateFrom) {
      query = query.where('o.created_at', '>=', dateFrom);
    }

    if (dateTo) {
      query = query.where('o.created_at', '<=', dateTo);
    }

    const orders = await query;

    if (format === 'csv') {
      const csv = [
        ['Order Number', 'Status', 'Product', 'Quantity', 'Price', 'Subtotal', 'Date'].join(','),
        ...orders.map(order => [
          order.order_number,
          order.status,
          order.product_name,
          order.quantity,
          order.price,
          order.subtotal,
          new Date(order.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
      res.send(csv);
    } else {
      successResponse(res, { orders }, 'Orders exported successfully');
    }

  } catch (error) {
    next(error);
  }
};
