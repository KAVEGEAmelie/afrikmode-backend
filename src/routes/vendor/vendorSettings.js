const express = require('express');
const router = express.Router();
const vendorSettingsController = require('../../controllers/vendor/vendorSettingsController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.get('/', vendorSettingsController.getVendorSettings);
router.put('/profile', vendorSettingsController.updateProfile);
router.put('/business', vendorSettingsController.updateBusinessInfo);
router.put('/notifications', vendorSettingsController.updateNotificationPreferences);
router.post('/logo', vendorSettingsController.uploadLogo);
router.put('/store-hours', vendorSettingsController.updateStoreHours);
router.put('/social-media', vendorSettingsController.updateSocialMedia);
router.put('/return-policy', vendorSettingsController.updateReturnPolicy);
router.put('/payment', vendorSettingsController.updatePaymentSettings);

module.exports = router;
