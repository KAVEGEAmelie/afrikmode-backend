const express = require('express');
const router = express.Router();
const adminVendorController = require('../../controllers/admin/adminVendorController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

router.get('/', adminVendorController.getVendors);
router.get('/stats', adminVendorController.getVendorsStats);
router.get('/:id', adminVendorController.getVendorById);
router.get('/:id/sanction-history', adminVendorController.getVendorSanctionHistory);
router.post('/:id/warning', adminVendorController.sendWarning);
router.post('/:id/suspend', adminVendorController.suspendVendor);
router.post('/:id/ban', adminVendorController.banVendor);
router.post('/:id/reactivate', adminVendorController.reactivateVendor);

module.exports = router;
