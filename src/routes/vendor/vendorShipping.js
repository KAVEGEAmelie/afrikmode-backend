const express = require('express');
const router = express.Router();
const vendorShippingController = require('../../controllers/vendor/vendorShippingController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.route('/zones')
  .get(vendorShippingController.getShippingZones)
  .post(vendorShippingController.createShippingZone);

router.route('/zones/:id')
  .put(vendorShippingController.updateShippingZone)
  .delete(vendorShippingController.deleteShippingZone);

router.route('/rates')
  .get(vendorShippingController.getShippingRates)
  .post(vendorShippingController.createShippingRate);

router.route('/rates/:id')
  .put(vendorShippingController.updateShippingRate)
  .delete(vendorShippingController.deleteShippingRate);

router.get('/carriers', vendorShippingController.getCarriers);

module.exports = router;
