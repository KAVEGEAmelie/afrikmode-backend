const express = require('express');
const router = express.Router();
const vendorAnalyticsController = require('../../controllers/vendor/vendorAnalyticsController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

// All routes require authentication and vendor role
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/analytics/sales:
 *   get:
 *     tags: [Vendor Analytics]
 *     summary: Get sales analytics
 *     security:
 *       - bearerAuth: []
 */
router.get('/sales', vendorAnalyticsController.getSalesAnalytics);

/**
 * @swagger
 * /api/vendor/analytics/products:
 *   get:
 *     tags: [Vendor Analytics]
 *     summary: Get product performance
 *     security:
 *       - bearerAuth: []
 */
router.get('/products', vendorAnalyticsController.getProductPerformance);

/**
 * @swagger
 * /api/vendor/analytics/customers:
 *   get:
 *     tags: [Vendor Analytics]
 *     summary: Get customer insights
 *     security:
 *       - bearerAuth: []
 */
router.get('/customers', vendorAnalyticsController.getCustomerInsights);

/**
 * @swagger
 * /api/vendor/analytics/traffic:
 *   get:
 *     tags: [Vendor Analytics]
 *     summary: Get traffic sources
 *     security:
 *       - bearerAuth: []
 */
router.get('/traffic', vendorAnalyticsController.getTrafficSources);

/**
 * @swagger
 * /api/vendor/analytics/conversions:
 *   get:
 *     tags: [Vendor Analytics]
 *     summary: Get conversion rates
 *     security:
 *       - bearerAuth: []
 */
router.get('/conversions', vendorAnalyticsController.getConversionRates);

module.exports = router;
