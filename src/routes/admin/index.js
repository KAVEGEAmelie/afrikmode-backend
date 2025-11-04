const express = require('express');
const router = express.Router();

// Import all admin route modules
const usersRoutes = require('./adminUsers');
const vendorRequestsRoutes = require('./adminVendorRequests');
const vendorsRoutes = require('./adminVendors');
const categoriesRoutes = require('./adminCategories');
const contentModerationRoutes = require('./adminContentModeration');
const transactionsRoutes = require('./adminTransactions');
const paymentConfigRoutes = require('./adminPaymentConfig');
const reportsRoutes = require('./adminReports');
const editorialRoutes = require('./adminEditorial');

/**
 * @swagger
 * tags:
 *   - name: Admin - Users
 *     description: User management (CRUD, status, roles)
 *   - name: Admin - Vendor Requests
 *     description: Vendor application approval management
 *   - name: Admin - Vendors
 *     description: Vendor moderation (warnings, suspensions, bans)
 *   - name: Admin - Categories
 *     description: Category management
 *   - name: Admin - Content Moderation
 *     description: Flagged content management
 *   - name: Admin - Transactions
 *     description: Transaction and dispute management
 *   - name: Admin - Payment Config
 *     description: Payment methods and commission configuration
 *   - name: Admin - Reports
 *     description: Report generation and scheduling
 *   - name: Admin - Editorial
 *     description: Blog, featured items, banners, newsletters
 */

// Mount all admin routes
router.use('/users', usersRoutes);
router.use('/vendor-requests', vendorRequestsRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/content-moderation', contentModerationRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/payment-config', paymentConfigRoutes);
router.use('/reports', reportsRoutes);
router.use('/editorial', editorialRoutes);

module.exports = router;
