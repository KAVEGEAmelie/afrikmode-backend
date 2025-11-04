const express = require('express');
const router = express.Router();
const vendorAnalyticsController = require('../controllers/vendorAnalyticsController');
const { requireAuth, requireVendorRole } = require('../middleware/auth');

// All routes require vendor authentication
router.use(requireAuth);
router.use(requireVendorRole);

// Analytics endpoints
router.get('/dashboard', vendorAnalyticsController.getAnalyticsDashboard);
router.get('/sales', vendorAnalyticsController.getSalesAnalytics);
router.get('/products', vendorAnalyticsController.getProductPerformance);
router.get('/customers', vendorAnalyticsController.getCustomerInsights);
router.get('/traffic', vendorAnalyticsController.getTrafficSources);
router.get('/conversion', vendorAnalyticsController.getConversionRates);

module.exports = router;
