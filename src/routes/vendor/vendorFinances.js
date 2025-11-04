const express = require('express');
const router = express.Router();
const vendorFinanceController = require('../../controllers/vendor/vendorFinanceController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

// All routes require authentication and vendor role
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/finances/revenue:
 *   get:
 *     tags: [Vendor Finances]
 *     summary: Get revenue summary
 *     security:
 *       - bearerAuth: []
 */
router.get('/revenue', vendorFinanceController.getRevenueSummary);

/**
 * @swagger
 * /api/vendor/finances/payouts:
 *   get:
 *     tags: [Vendor Finances]
 *     summary: Get payouts list
 *     security:
 *       - bearerAuth: []
 */
router.get('/payouts', vendorFinanceController.getPayouts);

/**
 * @swagger
 * /api/vendor/finances/payouts/request:
 *   post:
 *     tags: [Vendor Finances]
 *     summary: Request payout
 *     security:
 *       - bearerAuth: []
 */
router.post('/payouts/request', vendorFinanceController.requestPayout);

/**
 * @swagger
 * /api/vendor/finances/transactions:
 *   get:
 *     tags: [Vendor Finances]
 *     summary: Get transactions
 *     security:
 *       - bearerAuth: []
 */
router.get('/transactions', vendorFinanceController.getTransactions);

/**
 * @swagger
 * /api/vendor/finances/revenue-chart:
 *   get:
 *     tags: [Vendor Finances]
 *     summary: Get revenue chart data
 *     security:
 *       - bearerAuth: []
 */
router.get('/revenue-chart', vendorFinanceController.getRevenueChart);

/**
 * @swagger
 * /api/vendor/finances/payment-methods:
 *   get:
 *     tags: [Vendor Finances]
 *     summary: Get payment methods
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Vendor Finances]
 *     summary: Add payment method
 *     security:
 *       - bearerAuth: []
 */
router.route('/payment-methods')
  .get(vendorFinanceController.getPaymentMethods)
  .post(vendorFinanceController.addPaymentMethod);

/**
 * @swagger
 * /api/vendor/finances/payment-methods/{id}:
 *   delete:
 *     tags: [Vendor Finances]
 *     summary: Delete payment method
 *     security:
 *       - bearerAuth: []
 */
router.delete('/payment-methods/:id', vendorFinanceController.deletePaymentMethod);

module.exports = router;
