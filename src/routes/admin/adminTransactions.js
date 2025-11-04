const express = require('express');
const router = express.Router();
const adminTransactionController = require('../../controllers/admin/adminTransactionController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

router.get('/', adminTransactionController.getTransactions);
router.get('/stats', adminTransactionController.getTransactionStats);
router.get('/export', adminTransactionController.exportTransactions);
router.get('/by-payment-method', adminTransactionController.getTransactionsByPaymentMethod);
router.get('/:id', adminTransactionController.getTransactionById);
router.post('/:id/resolve-dispute', adminTransactionController.resolveDispute);
router.post('/:id/refund', adminTransactionController.refundTransaction);

module.exports = router;
