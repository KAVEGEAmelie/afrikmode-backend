const express = require('express');
const router = express.Router();
const vendorOrderController = require('../../controllers/vendor/vendorOrderController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

// All routes require authentication and vendor role
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/orders:
 *   get:
 *     tags: [Vendor Orders]
 *     summary: Get vendor orders
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/', vendorOrderController.getVendorOrders);

/**
 * @swagger
 * /api/vendor/orders/stats:
 *   get:
 *     tags: [Vendor Orders]
 *     summary: Get orders statistics
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', vendorOrderController.getOrdersStats);

/**
 * @swagger
 * /api/vendor/orders/export:
 *   get:
 *     tags: [Vendor Orders]
 *     summary: Export vendor orders
 *     security:
 *       - bearerAuth: []
 */
router.get('/export', vendorOrderController.exportOrders);

/**
 * @swagger
 * /api/vendor/orders/{id}:
 *   get:
 *     tags: [Vendor Orders]
 *     summary: Get single vendor order
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', vendorOrderController.getVendorOrder);

/**
 * @swagger
 * /api/vendor/orders/{id}/status:
 *   patch:
 *     tags: [Vendor Orders]
 *     summary: Update order status
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', vendorOrderController.updateOrderStatus);

/**
 * @swagger
 * /api/vendor/orders/{id}/ship:
 *   post:
 *     tags: [Vendor Orders]
 *     summary: Mark order as shipped
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/ship', vendorOrderController.markAsShipped);

module.exports = router;
