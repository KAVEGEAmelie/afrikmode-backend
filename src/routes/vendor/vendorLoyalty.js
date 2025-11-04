const express = require('express');
const router = express.Router();
const vendorLoyaltyController = require('../../controllers/vendor/vendorLoyaltyController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.route('/program')
  .get(vendorLoyaltyController.getLoyaltyProgram)
  .post(vendorLoyaltyController.createLoyaltyProgram)
  .put(vendorLoyaltyController.updateLoyaltyProgram);

router.route('/tiers')
  .post(vendorLoyaltyController.createTier);

router.route('/tiers/:id')
  .put(vendorLoyaltyController.updateTier)
  .delete(vendorLoyaltyController.deleteTier);

router.route('/rewards')
  .post(vendorLoyaltyController.createReward);

router.route('/rewards/:id')
  .put(vendorLoyaltyController.updateReward)
  .delete(vendorLoyaltyController.deleteReward);

router.get('/stats', vendorLoyaltyController.getMemberStats);

module.exports = router;
