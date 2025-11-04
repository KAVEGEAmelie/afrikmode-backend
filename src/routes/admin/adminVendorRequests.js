const express = require('express');
const router = express.Router();
const adminVendorRequestController = require('../../controllers/admin/adminVendorRequestController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

// All routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdminRole);

/**
 * @swagger
 * /api/admin/vendor-requests:
 *   get:
 *     tags: [Admin - Vendor Requests]
 *     summary: Get all vendor requests
 *     security:
 *       - bearerAuth: []
 */
router.get('/', adminVendorRequestController.getVendorRequests);

/**
 * @swagger
 * /api/admin/vendor-requests/stats:
 *   get:
 *     tags: [Admin - Vendor Requests]
 *     summary: Get vendor requests statistics
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', adminVendorRequestController.getRequestsStats);

/**
 * @swagger
 * /api/admin/vendor-requests/{id}:
 *   get:
 *     tags: [Admin - Vendor Requests]
 *     summary: Get vendor request by ID
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', adminVendorRequestController.getVendorRequestById);

/**
 * @swagger
 * /api/admin/vendor-requests/{id}/approve:
 *   post:
 *     tags: [Admin - Vendor Requests]
 *     summary: Approve vendor request
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/approve', adminVendorRequestController.approveRequest);

/**
 * @swagger
 * /api/admin/vendor-requests/{id}/reject:
 *   post:
 *     tags: [Admin - Vendor Requests]
 *     summary: Reject vendor request
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/reject', adminVendorRequestController.rejectRequest);

/**
 * @swagger
 * /api/admin/vendor-requests/{id}/request-info:
 *   post:
 *     tags: [Admin - Vendor Requests]
 *     summary: Request additional information
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/request-info', adminVendorRequestController.requestAdditionalInfo);

/**
 * @swagger
 * /api/admin/vendor-requests/{id}/documents/{type}:
 *   get:
 *     tags: [Admin - Vendor Requests]
 *     summary: Download vendor request document
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/documents/:type', adminVendorRequestController.downloadDocument);

module.exports = router;
