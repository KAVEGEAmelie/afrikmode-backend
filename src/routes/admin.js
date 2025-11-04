const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

// Import admin sub-routes
const adminStoresRoutes = require('./adminStores');

// Middleware pour vérifier que l'utilisateur est admin
router.use(requireRole(['admin', 'super_admin']));

// Mount admin sub-routes
router.use('/stores', adminStoresRoutes);

// Admin dashboard stats
router.get('/dashboard', async (req, res) => {
  const db = require('../config/database');
  
  try {
    // Stats globales
    const stats = await Promise.all([
      // Total utilisateurs
      db('users').whereNull('deleted_at').count('id as count').first(),
      // Total boutiques
      db('stores').whereNull('deleted_at').count('id as count').first(),
      // Total produits
      db('products').whereNull('deleted_at').count('id as count').first(),
      // Total commandes
      db('orders').count('id as count').first(),
      // Boutiques en attente
      db('stores').where('status', 'pending').whereNull('deleted_at').count('id as count').first(),
      // Commandes du jour
      db('orders').where(db.raw("DATE(created_at) = CURRENT_DATE")).count('id as count').first(),
      // Revenus total
      db('orders').where('status', 'delivered').sum('total_amount as total').first()
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(stats[0].count) || 0,
        totalStores: parseInt(stats[1].count) || 0,
        totalProducts: parseInt(stats[2].count) || 0,
        totalOrders: parseInt(stats[3].count) || 0,
        pendingStores: parseInt(stats[4].count) || 0,
        todayOrders: parseInt(stats[5].count) || 0,
        totalRevenue: parseFloat(stats[6].total) || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des stats',
      error: error.message
    });
  }
});

module.exports = router;
