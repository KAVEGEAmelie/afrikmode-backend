/**
 * Vendor Orders Controller
 * Gestion des commandes du vendeur
 */

const db = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Obtenir toutes les commandes du vendeur
 * @route   GET /api/vendor/orders
 * @access  Private/Vendor
 */
exports.getVendorOrders = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const status = req.query.status;
  const paymentStatus = req.query.payment_status;
  const search = req.query.search;
  const dateFrom = req.query.date_from;
  const dateTo = req.query.date_to;

  let query = db('orders as o')
    .select(
      'o.id',
      'o.order_number',
      'o.total_amount',
      'o.status',
      'o.payment_status',
      'o.payment_method',
      'o.created_at',
      'o.updated_at',
      'u.first_name',
      'u.last_name',
      'u.email',
      'u.phone',
      db.raw('COUNT(DISTINCT oi.id) as items_count'),
      db.raw('SUM(oi.quantity) as total_quantity')
    )
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .join('users as u', 'o.customer_id', 'u.id')
    .where('p.vendor_id', vendorId)
    .groupBy('o.id', 'u.id');

  // Filtres
  if (status) {
    query = query.where('o.status', status);
  }

  if (paymentStatus) {
    query = query.where('o.payment_status', paymentStatus);
  }

  if (search) {
    query = query.where(function() {
      this.where('o.order_number', 'like', `%${search}%`)
        .orWhere('u.first_name', 'like', `%${search}%`)
        .orWhere('u.last_name', 'like', `%${search}%`)
        .orWhere('u.email', 'like', `%${search}%`);
    });
  }

  if (dateFrom) {
    query = query.where('o.created_at', '>=', new Date(dateFrom));
  }

  if (dateTo) {
    query = query.where('o.created_at', '<=', new Date(dateTo));
  }

  // Tri par date décroissante
  query = query.orderBy('o.created_at', 'desc');

  // Pagination
  const orders = await query.limit(limit).offset(offset);

  // Total pour pagination
  let totalQuery = db('orders as o')
    .count('DISTINCT o.id as count')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId);

  if (status) totalQuery = totalQuery.where('o.status', status);
  if (paymentStatus) totalQuery = totalQuery.where('o.payment_status', paymentStatus);
  if (dateFrom) totalQuery = totalQuery.where('o.created_at', '>=', new Date(dateFrom));
  if (dateTo) totalQuery = totalQuery.where('o.created_at', '<=', new Date(dateTo));

  const total = await totalQuery.first();

  res.status(200).json({
    success: true,
    data: orders.map(order => ({
      ...order,
      items_count: parseInt(order.items_count),
      total_quantity: parseInt(order.total_quantity)
    })),
    pagination: {
      page,
      limit,
      total: parseInt(total.count),
      pages: Math.ceil(total.count / limit)
    }
  });
});

/**
 * @desc    Obtenir les détails d'une commande
 * @route   GET /api/vendor/orders/:id
 * @access  Private/Vendor
 */
exports.getVendorOrder = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const orderId = req.params.id;

  // Récupérer la commande
  const order = await db('orders as o')
    .select(
      'o.*',
      'u.first_name',
      'u.last_name',
      'u.email',
      'u.phone'
    )
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .join('users as u', 'o.customer_id', 'u.id')
    .where('o.id', orderId)
    .andWhere('p.vendor_id', vendorId)
    .first();

  if (!order) {
    return next(new AppError('Commande non trouvée', 404));
  }

  // Récupérer les articles de la commande (seulement ceux du vendeur)
  const items = await db('order_items as oi')
    .select(
      'oi.*',
      'p.name as product_name',
      'p.image_url',
      'p.sku'
    )
    .join('products as p', 'oi.product_id', 'p.id')
    .where('oi.order_id', orderId)
    .andWhere('p.vendor_id', vendorId);

  // Récupérer l'adresse de livraison
  const shippingAddress = await db('order_addresses')
    .where('order_id', orderId)
    .andWhere('type', 'shipping')
    .first();

  // Récupérer l'historique de statut
  const statusHistory = await db('order_status_history')
    .select('*')
    .where('order_id', orderId)
    .orderBy('created_at', 'desc');

  res.status(200).json({
    success: true,
    data: {
      ...order,
      items,
      shipping_address: shippingAddress,
      status_history: statusHistory
    }
  });
});

/**
 * @desc    Mettre à jour le statut d'une commande
 * @route   PATCH /api/vendor/orders/:id/status
 * @access  Private/Vendor
 */
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const orderId = req.params.id;
  const { status, note } = req.body;

  const allowedStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];

  if (!allowedStatuses.includes(status)) {
    return next(new AppError('Statut invalide', 400));
  }

  // Vérifier que la commande appartient au vendeur
  const order = await db('orders as o')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('o.id', orderId)
    .andWhere('p.vendor_id', vendorId)
    .first();

  if (!order) {
    return next(new AppError('Commande non trouvée', 404));
  }

  // Mettre à jour le statut
  await db('orders')
    .where('id', orderId)
    .update({
      status,
      updated_at: new Date()
    });

  // Ajouter à l'historique
  await db('order_status_history').insert({
    order_id: orderId,
    status,
    note: note || '',
    changed_by: req.user.id,
    created_at: new Date()
  });

  // Si livré, mettre à jour la date de livraison
  if (status === 'delivered') {
    await db('orders')
      .where('id', orderId)
      .update({ delivered_at: new Date() });
  }

  res.status(200).json({
    success: true,
    message: 'Statut de la commande mis à jour avec succès',
    data: { status }
  });
});

/**
 * @desc    Marquer une commande comme expédiée
 * @route   POST /api/vendor/orders/:id/ship
 * @access  Private/Vendor
 */
exports.markAsShipped = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const orderId = req.params.id;
  const { tracking_number, carrier, shipping_date, estimated_delivery } = req.body;

  // Vérifier que la commande appartient au vendeur
  const order = await db('orders as o')
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('o.id', orderId)
    .andWhere('p.vendor_id', vendorId)
    .first();

  if (!order) {
    return next(new AppError('Commande non trouvée', 404));
  }

  if (order.status !== 'processing') {
    return next(new AppError('Seules les commandes en cours de traitement peuvent être expédiées', 400));
  }

  // Mettre à jour la commande
  await db('orders')
    .where('id', orderId)
    .update({
      status: 'shipped',
      tracking_number,
      carrier,
      shipped_at: shipping_date ? new Date(shipping_date) : new Date(),
      estimated_delivery_at: estimated_delivery ? new Date(estimated_delivery) : null,
      updated_at: new Date()
    });

  // Ajouter à l'historique
  await db('order_status_history').insert({
    order_id: orderId,
    status: 'shipped',
    note: `Expédié via ${carrier}. Numéro de suivi: ${tracking_number}`,
    changed_by: req.user.id,
    created_at: new Date()
  });

  res.status(200).json({
    success: true,
    message: 'Commande marquée comme expédiée',
    data: {
      status: 'shipped',
      tracking_number,
      carrier
    }
  });
});

/**
 * @desc    Obtenir les statistiques des commandes
 * @route   GET /api/vendor/orders/stats
 * @access  Private/Vendor
 */
exports.getOrdersStats = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const dateFrom = req.query.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = req.query.date_to || new Date();

  // Stats par statut
  const statusStats = await db('orders as o')
    .select(
      'o.status',
      db.raw('COUNT(DISTINCT o.id) as count'),
      db.raw('SUM(o.total_amount) as total_amount')
    )
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('p.vendor_id', vendorId)
    .andWhere('o.created_at', '>=', dateFrom)
    .andWhere('o.created_at', '<=', dateTo)
    .groupBy('o.status');

  // Total des commandes
  const totalOrders = statusStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
  const totalRevenue = statusStats.reduce((sum, stat) => sum + parseFloat(stat.total_amount || 0), 0);

  // Commandes en attente
  const pendingOrders = statusStats.find(s => s.status === 'pending')?.count || 0;

  // Commandes en cours
  const processingOrders = statusStats.find(s => s.status === 'processing')?.count || 0;

  // Commandes expédiées
  const shippedOrders = statusStats.find(s => s.status === 'shipped')?.count || 0;

  // Commandes livrées
  const deliveredOrders = statusStats.find(s => s.status === 'delivered')?.count || 0;

  // Taux de livraison
  const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      pending_orders: parseInt(pendingOrders),
      processing_orders: parseInt(processingOrders),
      shipped_orders: parseInt(shippedOrders),
      delivered_orders: parseInt(deliveredOrders),
      delivery_rate: parseFloat(deliveryRate.toFixed(2)),
      status_breakdown: statusStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.count),
        total_amount: parseFloat(stat.total_amount || 0)
      }))
    }
  });
});

/**
 * @desc    Exporter les commandes
 * @route   GET /api/vendor/orders/export
 * @access  Private/Vendor
 */
exports.exportOrders = asyncHandler(async (req, res, next) => {
  const vendorId = req.user.vendorId;
  const format = req.query.format || 'csv'; // csv ou excel
  const dateFrom = req.query.date_from;
  const dateTo = req.query.date_to;

  let query = db('orders as o')
    .select(
      'o.order_number',
      'o.total_amount',
      'o.status',
      'o.payment_status',
      'o.payment_method',
      'o.created_at',
      'u.first_name',
      'u.last_name',
      'u.email'
    )
    .join('order_items as oi', 'o.id', 'oi.order_id')
    .join('products as p', 'oi.product_id', 'p.id')
    .join('users as u', 'o.customer_id', 'u.id')
    .where('p.vendor_id', vendorId)
    .groupBy('o.id', 'u.id');

  if (dateFrom) query = query.where('o.created_at', '>=', new Date(dateFrom));
  if (dateTo) query = query.where('o.created_at', '<=', new Date(dateTo));

  const orders = await query.orderBy('o.created_at', 'desc');

  // TODO: Implémenter la génération CSV/Excel avec une librairie
  // Pour l'instant, retourner les données JSON
  res.status(200).json({
    success: true,
    message: 'Export disponible (à implémenter avec CSV/Excel)',
    data: orders
  });
});
