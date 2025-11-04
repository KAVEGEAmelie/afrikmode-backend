/**
 * Routes du tableau de bord vendeur
 */

const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentOrders,
  getRevenueChart,
  getTopProducts,
  getAlerts,
  getPerformance
} = require('../controllers/vendorDashboardController');
const { requireAuth, requireVendorRole } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification et le rôle vendeur
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/dashboard/stats:
 *   get:
 *     summary: Obtenir les statistiques du tableau de bord
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 */
router.get('/stats', getDashboardStats);

/**
 * @swagger
 * /api/vendor/dashboard/recent-orders:
 *   get:
 *     summary: Obtenir les commandes récentes
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre de commandes à retourner (défaut 10)
 *     responses:
 *       200:
 *         description: Commandes récupérées avec succès
 */
router.get('/recent-orders', getRecentOrders);

/**
 * @swagger
 * /api/vendor/dashboard/revenue-chart:
 *   get:
 *     summary: Obtenir les données du graphique des revenus
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, 12months]
 *         description: Période du graphique
 *     responses:
 *       200:
 *         description: Données du graphique récupérées avec succès
 */
router.get('/revenue-chart', getRevenueChart);

/**
 * @swagger
 * /api/vendor/dashboard/top-products:
 *   get:
 *     summary: Obtenir les produits les plus vendus
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre de produits à retourner (défaut 5)
 *     responses:
 *       200:
 *         description: Produits récupérés avec succès
 */
router.get('/top-products', getTopProducts);

/**
 * @swagger
 * /api/vendor/dashboard/alerts:
 *   get:
 *     summary: Obtenir les alertes (stock faible, commandes en attente, etc.)
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alertes récupérées avec succès
 */
router.get('/alerts', getAlerts);

/**
 * @swagger
 * /api/vendor/dashboard/performance:
 *   get:
 *     summary: Obtenir le résumé de performance du vendeur
 *     tags: [Vendor Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance récupérée avec succès
 */
router.get('/performance', getPerformance);

module.exports = router;
