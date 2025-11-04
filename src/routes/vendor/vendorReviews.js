const express = require('express');
const router = express.Router();
const vendorReviewController = require('../../controllers/vendor/vendorReviewController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.get('/', vendorReviewController.getVendorReviews);
router.get('/stats', vendorReviewController.getReviewStats);
router.get('/pending', vendorReviewController.getPendingResponses);
router.post('/:id/respond', vendorReviewController.respondToReview);
router.delete('/:id/response', vendorReviewController.deleteResponse);

module.exports = router;
