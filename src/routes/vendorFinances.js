/**
 * Routes des finances vendeur
 */

const express = require('express');
const router = express.Router();
const {
  getRevenueSummary,
  getPayouts,
  requestPayout,
  getTransactions,
  getRevenueChart,
  getFinanceStats
} = require('../controllers/vendorFinancesController');
const { requireAuth, requireVendorRole } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification et le rôle vendeur
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/finances/revenue-summary:
 *   get:
 *     summary: Obtenir le résumé des revenus
 *     tags: [Vendor Finances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, 12months]
 *     responses:
 *       200:
 *         description: Résumé des revenus
 */
router.get('/revenue-summary', getRevenueSummary);

/**
 * @swagger
 * /api/vendor/finances/payouts:
 *   get:
 *     summary: Obtenir l'historique des paiements
 *     tags: [Vendor Finances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, cancelled]
 *     responses:
 *       200:
 *         description: Liste des paiements
 */
router.get('/payouts', getPayouts);

/**
 * @swagger
 * /api/vendor/finances/request-payout:
 *   post:
 *     summary: Demander un retrait
 *     tags: [Vendor Finances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [mtn_money, orange_money, moov_money, bank_transfer]
 *               account_details:
 *                 type: object
 *     responses:
 *       201:
 *         description: Demande de retrait créée
 */
router.post('/request-payout', requestPayout);

/**
 * @swagger
 * /api/vendor/finances/transactions:
 *   get:
 *     summary: Obtenir les transactions
 *     tags: [Vendor Finances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sale, refund, payout]
 *     responses:
 *       200:
 *         description: Liste des transactions
 */
router.get('/transactions', getTransactions);

/**
 * @swagger
 * /api/vendor/finances/revenue-chart:
 *   get:
 *     summary: Obtenir le graphique des revenus
 *     tags: [Vendor Finances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7days, 30days, 90days, 12months]
 *     responses:
 *       200:
 *         description: Données du graphique
 */
router.get('/revenue-chart', getRevenueChart);

/**
 * @swagger
 * /api/vendor/finances/stats:
 *   get:
 *     summary: Obtenir les statistiques financières
 *     tags: [Vendor Finances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques financières
 */
router.get('/stats', getFinanceStats);

module.exports = router;
