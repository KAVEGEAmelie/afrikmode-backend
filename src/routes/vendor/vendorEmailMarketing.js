const express = require('express');
const router = express.Router();
const vendorEmailMarketingController = require('../../controllers/vendor/vendorEmailMarketingController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.route('/campaigns')
  .get(vendorEmailMarketingController.getCampaigns)
  .post(vendorEmailMarketingController.createCampaign);

router.route('/campaigns/:id')
  .put(vendorEmailMarketingController.updateCampaign)
  .delete(vendorEmailMarketingController.deleteCampaign);

router.post('/campaigns/:id/send', vendorEmailMarketingController.sendCampaign);

router.route('/templates')
  .get(vendorEmailMarketingController.getTemplates)
  .post(vendorEmailMarketingController.createTemplate);

router.get('/subscribers', vendorEmailMarketingController.getSubscribers);
router.get('/stats', vendorEmailMarketingController.getEmailMarketingStats);

module.exports = router;
