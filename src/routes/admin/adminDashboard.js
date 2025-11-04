const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const db = require('../../config/database');
const { cache, CACHE_KEYS } = require('../../config/redis');

/**
 * @route GET /api/admin/dashboard
 * @desc Statistiques globales du dashboard admin
 * @access Private (Admin)
 */
router.get('/',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    // Vérifier le cache
    const cacheKey = `${CACHE_KEYS.ADMIN}:dashboard:stats`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Récupérer toutes les stats en parallèle
    const [usersStats, storesStats, productsStats, ordersStats, revenueStats, todayOrders] = await Promise.all([
      // Total utilisateurs
      db('users')
        .whereNull('deleted_at')
        .count('id as count')
        .first(),
      
      // Total boutiques et pending
      db('stores')
        .select([
          db.raw('COUNT(*) as total'),
          db.raw("COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending")
        ])
        .whereNull('deleted_at')
        .first(),
      
      // Total produits
      db('products')
        .whereNull('deleted_at')
        .count('id as count')
        .first(),
      
      // Total commandes
      db('orders')
        .whereNull('deleted_at')
        .count('id as count')
        .first(),
      
      // Revenue total
      db('orders')
        .where('status', 'completed')
        .sum('total_amount as total')
        .first(),
      
      // Commandes du jour
      db('orders')
        .whereRaw("DATE(created_at) = CURRENT_DATE")
        .whereNull('deleted_at')
        .count('id as count')
        .first()
    ]);

    const data = {
      totalUsers: parseInt(usersStats?.count || 0),
      totalStores: parseInt(storesStats?.total || 0),
      pendingStores: parseInt(storesStats?.pending || 0),
      totalProducts: parseInt(productsStats?.count || 0),
      totalOrders: parseInt(ordersStats?.count || 0),
      totalRevenue: parseFloat(revenueStats?.total || 0),
      todayOrders: parseInt(todayOrders?.count || 0)
    };

    // Mettre en cache pour 5 minutes
    await cache.set(cacheKey, data, 300);

    res.json({
      success: true,
      data,
      cached: false
    });
  })
);

/**
 * @route GET /api/admin/dashboard/recent-activity
 * @desc Activités récentes (dernières commandes, nouveaux users, etc.)
 * @access Private (Admin)
 */
router.get('/recent-activity',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    // Récupérer les dernières activités
    const [recentOrders, recentUsers, recentStores] = await Promise.all([
      // Dernières commandes
      db('orders')
        .leftJoin('users', 'orders.user_id', 'users.id')
        .select([
          'orders.id',
          'orders.order_number',
          'orders.total_amount',
          'orders.status',
          'orders.created_at',
          'users.name as customer_name',
          'users.email as customer_email'
        ])
        .whereNull('orders.deleted_at')
        .orderBy('orders.created_at', 'desc')
        .limit(parseInt(limit)),
      
      // Nouveaux utilisateurs
      db('users')
        .select(['id', 'name', 'email', 'role', 'created_at'])
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit)),
      
      // Nouvelles demandes boutiques
      db('stores')
        .leftJoin('users', 'stores.owner_id', 'users.id')
        .select([
          'stores.id',
          'stores.name as store_name',
          'stores.status',
          'stores.created_at',
          'users.name as vendor_name',
          'users.email as vendor_email'
        ])
        .whereNull('stores.deleted_at')
        .orderBy('stores.created_at', 'desc')
        .limit(parseInt(limit))
    ]);

    res.json({
      success: true,
      data: {
        recentOrders,
        recentUsers,
        recentStores
      }
    });
  })
);

/**
 * @route GET /api/admin/dashboard/charts
 * @desc Données pour les graphiques du dashboard
 * @access Private (Admin)
 */
router.get('/charts',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { period = '7days' } = req.query;

    let dateFilter;
    switch (period) {
      case '24hours':
        dateFilter = db.raw("created_at >= NOW() - INTERVAL '24 hours'");
        break;
      case '7days':
        dateFilter = db.raw("created_at >= NOW() - INTERVAL '7 days'");
        break;
      case '30days':
        dateFilter = db.raw("created_at >= NOW() - INTERVAL '30 days'");
        break;
      case '90days':
        dateFilter = db.raw("created_at >= NOW() - INTERVAL '90 days'");
        break;
      default:
        dateFilter = db.raw("created_at >= NOW() - INTERVAL '7 days'");
    }

    // Récupérer les données pour les graphiques
    const [salesByDay, ordersByStatus, usersByRole] = await Promise.all([
      // Ventes par jour
      db('orders')
        .select([
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as orders'),
          db.raw('SUM(total_amount) as revenue')
        ])
        .where('status', 'completed')
        .whereRaw(dateFilter)
        .groupByRaw('DATE(created_at)')
        .orderByRaw('DATE(created_at) ASC'),
      
      // Commandes par statut
      db('orders')
        .select([
          'status',
          db.raw('COUNT(*) as count')
        ])
        .whereNull('deleted_at')
        .groupBy('status'),
      
      // Utilisateurs par rôle
      db('users')
        .select([
          'role',
          db.raw('COUNT(*) as count')
        ])
        .whereNull('deleted_at')
        .groupBy('role')
    ]);

    res.json({
      success: true,
      data: {
        salesByDay,
        ordersByStatus,
        usersByRole
      }
    });
  })
);

module.exports = router;
