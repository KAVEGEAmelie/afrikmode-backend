const express = require('express');
const router = express.Router();
const adminPaymentConfigController = require('../../controllers/admin/adminPaymentConfigController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

router.get('/', adminPaymentConfigController.getPaymentConfig);
router.get('/stats', adminPaymentConfigController.getPaymentStats);
router.get('/available-methods', adminPaymentConfigController.getAvailablePaymentMethods);
router.patch('/:method/toggle', adminPaymentConfigController.togglePaymentMethod);
router.put('/:method/keys', adminPaymentConfigController.updatePaymentMethodKeys);
router.post('/:method/test', adminPaymentConfigController.testPaymentProvider);
router.put('/commission', adminPaymentConfigController.updateCommissionRate);
router.put('/service-fee', adminPaymentConfigController.updateServiceFee);

module.exports = router;
