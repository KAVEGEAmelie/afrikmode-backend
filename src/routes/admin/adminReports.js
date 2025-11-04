const express = require('express');
const router = express.Router();
const adminReportController = require('../../controllers/admin/adminReportController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

router.get('/', adminReportController.getReports);
router.get('/types', adminReportController.getReportTypes);
router.post('/activity', adminReportController.generateActivityReport);
router.post('/transactions', adminReportController.generateTransactionReport);
router.post('/vendors', adminReportController.generateVendorReport);
router.post('/custom', adminReportController.generateCustomReport);
router.post('/schedule', adminReportController.scheduleReport);
router.get('/:id/download', adminReportController.downloadReport);

module.exports = router;
