const express = require('express');
const router = express.Router();
const vendorInventoryController = require('../../controllers/vendor/vendorInventoryController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.get('/', vendorInventoryController.getInventory);
router.get('/alerts', vendorInventoryController.getLowStockAlerts);
router.get('/stats', vendorInventoryController.getInventoryStats);
router.get('/history', vendorInventoryController.getStockHistory);
router.post('/:id/update-stock', vendorInventoryController.updateStock);
router.post('/bulk-update', vendorInventoryController.bulkUpdateStock);

module.exports = router;
