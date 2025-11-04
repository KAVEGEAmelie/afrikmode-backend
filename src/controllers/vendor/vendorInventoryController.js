const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get inventory stock levels
 * @route   GET /api/vendor/inventory
 * @access  Private/Vendor
 */
exports.getInventory = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, status, search, sortBy = 'updated_at' } = req.query;
    const offset = (page - 1) * limit;

    let query = db('products')
      .where('vendor_id', vendorId)
      .select(
        'id',
        'name',
        'sku',
        'stock_quantity',
        'low_stock_threshold',
        'price',
        'image_url',
        'status',
        'updated_at'
      );

    if (status === 'low') {
      query = query.whereRaw('stock_quantity <= low_stock_threshold');
    } else if (status === 'out') {
      query = query.where('stock_quantity', 0);
    }

    if (search) {
      query = query.where(function() {
        this.where('name', 'like', `%${search}%`)
            .orWhere('sku', 'like', `%${search}%`);
      });
    }

    const [{ count: total }] = await query.clone().count('* as count');
    const products = await query
      .orderBy(sortBy, 'desc')
      .limit(limit)
      .offset(offset);

    // Add stock status
    const productsWithStatus = products.map(product => ({
      ...product,
      stock_status: product.stock_quantity === 0 ? 'out_of_stock' :
                   product.stock_quantity <= product.low_stock_threshold ? 'low_stock' : 'in_stock'
    }));

    successResponse(res, {
      products: productsWithStatus,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Inventory retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update stock
 * @route   POST /api/vendor/inventory/:id/update-stock
 * @access  Private/Vendor
 */
exports.updateStock = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { quantity, type, reason } = req.body; // type: 'add' or 'remove'

    const product = await db('products')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!product) throw new AppError('Product not found', 404);

    const newQuantity = type === 'add' ? 
      product.stock_quantity + quantity : 
      Math.max(0, product.stock_quantity - quantity);

    await db.transaction(async (trx) => {
      // Update stock
      await trx('products')
        .where('id', id)
        .update({ 
          stock_quantity: newQuantity,
          updated_at: db.fn.now()
        });

      // Log stock movement
      await trx('stock_movements').insert({
        product_id: id,
        vendor_id: vendorId,
        type,
        quantity,
        previous_quantity: product.stock_quantity,
        new_quantity: newQuantity,
        reason,
        user_id: req.user.id,
        created_at: db.fn.now()
      });
    });

    const updatedProduct = await db('products').where('id', id).first();
    successResponse(res, { product: updatedProduct }, 'Stock updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock alerts
 * @route   GET /api/vendor/inventory/alerts
 * @access  Private/Vendor
 */
exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const lowStockProducts = await db('products')
      .where('vendor_id', vendorId)
      .whereRaw('stock_quantity <= low_stock_threshold')
      .where('status', 'active')
      .select(
        'id',
        'name',
        'sku',
        'stock_quantity',
        'low_stock_threshold',
        'image_url'
      )
      .orderBy('stock_quantity', 'asc');

    const outOfStockProducts = await db('products')
      .where('vendor_id', vendorId)
      .where('stock_quantity', 0)
      .where('status', 'active')
      .select(
        'id',
        'name',
        'sku',
        'image_url'
      );

    successResponse(res, {
      low_stock: lowStockProducts,
      out_of_stock: outOfStockProducts,
      low_stock_count: lowStockProducts.length,
      out_of_stock_count: outOfStockProducts.length
    }, 'Stock alerts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update stock
 * @route   POST /api/vendor/inventory/bulk-update
 * @access  Private/Vendor
 */
exports.bulkUpdateStock = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { updates } = req.body; // Array of { product_id, quantity, type }

    await db.transaction(async (trx) => {
      for (const update of updates) {
        const product = await trx('products')
          .where('id', update.product_id)
          .where('vendor_id', vendorId)
          .first();

        if (!product) continue;

        const newQuantity = update.type === 'set' ? 
          update.quantity :
          update.type === 'add' ?
            product.stock_quantity + update.quantity :
            Math.max(0, product.stock_quantity - update.quantity);

        await trx('products')
          .where('id', update.product_id)
          .update({ 
            stock_quantity: newQuantity,
            updated_at: db.fn.now()
          });

        await trx('stock_movements').insert({
          product_id: update.product_id,
          vendor_id: vendorId,
          type: update.type,
          quantity: update.quantity,
          previous_quantity: product.stock_quantity,
          new_quantity: newQuantity,
          reason: 'Bulk update',
          user_id: req.user.id,
          created_at: db.fn.now()
        });
      }
    });

    successResponse(res, null, `${updates.length} products updated successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stock movement history
 * @route   GET /api/vendor/inventory/history
 * @access  Private/Vendor
 */
exports.getStockHistory = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 50, product_id, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * limit;

    let query = db('stock_movements as sm')
      .join('products as p', 'sm.product_id', 'p.id')
      .leftJoin('users as u', 'sm.user_id', 'u.id')
      .where('sm.vendor_id', vendorId)
      .select(
        'sm.id',
        'sm.product_id',
        'sm.type',
        'sm.quantity',
        'sm.previous_quantity',
        'sm.new_quantity',
        'sm.reason',
        'sm.created_at',
        'p.name as product_name',
        'p.sku',
        'u.first_name',
        'u.last_name'
      );

    if (product_id) query = query.where('sm.product_id', product_id);
    if (dateFrom) query = query.where('sm.created_at', '>=', dateFrom);
    if (dateTo) query = query.where('sm.created_at', '<=', dateTo);

    const [{ count: total }] = await query.clone().count('sm.id as count');
    const history = await query
      .orderBy('sm.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      history,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Stock history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory stats
 * @route   GET /api/vendor/inventory/stats
 * @access  Private/Vendor
 */
exports.getInventoryStats = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const [{ total_products }] = await db('products')
      .where('vendor_id', vendorId)
      .count('* as total_products');

    const [{ total_stock }] = await db('products')
      .where('vendor_id', vendorId)
      .sum('stock_quantity as total_stock');

    const [{ low_stock_count }] = await db('products')
      .where('vendor_id', vendorId)
      .whereRaw('stock_quantity <= low_stock_threshold')
      .where('status', 'active')
      .count('* as low_stock_count');

    const [{ out_of_stock_count }] = await db('products')
      .where('vendor_id', vendorId)
      .where('stock_quantity', 0)
      .where('status', 'active')
      .count('* as out_of_stock_count');

    const [{ stock_value }] = await db('products')
      .where('vendor_id', vendorId)
      .sum(db.raw('stock_quantity * price as stock_value'));

    successResponse(res, {
      total_products: parseInt(total_products) || 0,
      total_stock: parseInt(total_stock) || 0,
      low_stock_count: parseInt(low_stock_count) || 0,
      out_of_stock_count: parseInt(out_of_stock_count) || 0,
      stock_value: parseFloat(stock_value) || 0
    }, 'Inventory stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
