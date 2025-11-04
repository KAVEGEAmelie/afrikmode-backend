const express = require('express');
const router = express.Router();
const vendorMarketingController = require('../../controllers/vendor/vendorMarketingController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.route('/campaigns')
  .get(vendorMarketingController.getCampaigns)
  .post(vendorMarketingController.createCampaign);

router.route('/campaigns/:id')
  .put(vendorMarketingController.updateCampaign)
  .delete(vendorMarketingController.deleteCampaign);

router.route('/coupons')
  .get(vendorMarketingController.getCoupons)
  .post(vendorMarketingController.createCoupon);

router.patch('/coupons/:id/toggle', vendorMarketingController.toggleCouponStatus);
router.get('/stats', vendorMarketingController.getMarketingStats);

module.exports = router;
