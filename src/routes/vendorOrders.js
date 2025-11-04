/**
 * Routes des commandes vendeur
 */

const express = require('express');
const router = express.Router();
const {
  getVendorOrders,
  getVendorOrder,
  updateOrderStatus,
  markAsShipped,
  getOrdersStats,
  exportOrders
} = require('../controllers/vendorOrdersController');
const { requireAuth, requireVendorRole } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification et le rôle vendeur
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/orders:
 *   get:
 *     summary: Obtenir toutes les commandes du vendeur
 *     tags: [Vendor Orders]
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
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Liste des commandes
 */
router.get('/', getVendorOrders);

/**
 * @swagger
 * /api/vendor/orders/stats:
 *   get:
 *     summary: Obtenir les statistiques des commandes
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistiques des commandes
 */
router.get('/stats', getOrdersStats);

/**
 * @swagger
 * /api/vendor/orders/export:
 *   get:
 *     summary: Exporter les commandes
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, excel]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Fichier d'export
 */
router.get('/export', exportOrders);

/**
 * @swagger
 * /api/vendor/orders/{id}:
 *   get:
 *     summary: Obtenir les détails d'une commande
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails de la commande
 */
router.get('/:id', getVendorOrder);

/**
 * @swagger
 * /api/vendor/orders/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'une commande
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [processing, shipped, delivered, cancelled]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 */
router.patch('/:id/status', updateOrderStatus);

/**
 * @swagger
 * /api/vendor/orders/{id}/ship:
 *   post:
 *     summary: Marquer une commande comme expédiée
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tracking_number
 *               - carrier
 *             properties:
 *               tracking_number:
 *                 type: string
 *               carrier:
 *                 type: string
 *               shipping_date:
 *                 type: string
 *                 format: date
 *               estimated_delivery:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Commande marquée comme expédiée
 */
router.post('/:id/ship', markAsShipped);

module.exports = router;
