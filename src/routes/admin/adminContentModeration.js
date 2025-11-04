const express = require('express');
const router = express.Router();
const adminContentModerationController = require('../../controllers/admin/adminContentModerationController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

router.get('/products', adminContentModerationController.getFlaggedProducts);
router.get('/reviews', adminContentModerationController.getFlaggedReviews);
router.post('/products/:id/approve', adminContentModerationController.approveProduct);
router.post('/products/:id/remove', adminContentModerationController.removeProduct);
router.post('/reviews/:id/approve', adminContentModerationController.approveReview);
router.post('/reviews/:id/remove', adminContentModerationController.removeReview);
router.get('/stats', adminContentModerationController.getModerationStats);
router.get('/common-reasons', adminContentModerationController.getCommonReportReasons);

module.exports = router;
