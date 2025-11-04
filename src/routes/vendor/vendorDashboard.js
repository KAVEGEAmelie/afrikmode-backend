const express = require('express');
const router = express.Router();
const { requireAuth, requireVendorRole } = require('../../middleware/auth');
const vendorDashboardController = require('../../controllers/vendorDashboardController');

/**
 * VENDOR DASHBOARD ROUTES
 * Base path: /api/vendor/dashboard
 * 
 * All routes require authentication and vendor role
 */

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireVendorRole);

// Dashboard Overview
router.get('/', vendorDashboardController.getDashboardOverview);

// Statistics & KPIs
router.get('/stats', vendorDashboardController.getDashboardStats);
router.get('/kpis', vendorDashboardController.getKPIs);

// Recent Activity
router.get('/activity', vendorDashboardController.getRecentActivity);
router.get('/activity/:type', vendorDashboardController.getActivityByType);

// Performance Metrics
router.get('/performance', vendorDashboardController.getPerformanceMetrics);
router.get('/performance/trends', vendorDashboardController.getPerformanceTrends);

// Quick Actions
router.get('/quick-actions', vendorDashboardController.getQuickActions);

// Notifications
router.get('/notifications', vendorDashboardController.getNotifications);
router.put('/notifications/:id/read', vendorDashboardController.markNotificationAsRead);
router.put('/notifications/read-all', vendorDashboardController.markAllNotificationsAsRead);

// Dashboard Settings
router.get('/settings', vendorDashboardController.getDashboardSettings);
router.put('/settings', vendorDashboardController.updateDashboardSettings);

// Widget Management
router.get('/widgets', vendorDashboardController.getWidgets);
router.put('/widgets', vendorDashboardController.updateWidgets);

// Export Dashboard Data
router.get('/export', vendorDashboardController.exportDashboardData);

module.exports = router;
