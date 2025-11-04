const express = require('express');
const router = express.Router();
const adminEditorialController = require('../../controllers/admin/adminEditorialController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

// Blog routes
router.get('/blog', adminEditorialController.getBlogPosts);
router.post('/blog', adminEditorialController.createBlogPost);
router.put('/blog/:id', adminEditorialController.updateBlogPost);
router.delete('/blog/:id', adminEditorialController.deleteBlogPost);
router.post('/blog/:id/publish', adminEditorialController.publishBlogPost);

// Featured items routes
router.get('/featured', adminEditorialController.getFeaturedItems);
router.post('/featured', adminEditorialController.addFeaturedItem);
router.delete('/featured/:id', adminEditorialController.removeFeaturedItem);
router.patch('/featured/:id/toggle', adminEditorialController.toggleFeaturedItem);

// Banners routes
router.get('/banners', adminEditorialController.getBanners);
router.post('/banners', adminEditorialController.createBanner);
router.put('/banners/:id', adminEditorialController.updateBanner);
router.delete('/banners/:id', adminEditorialController.deleteBanner);
router.patch('/banners/:id/toggle', adminEditorialController.toggleBanner);

// Newsletters routes
router.get('/newsletters', adminEditorialController.getNewsletters);
router.post('/newsletters', adminEditorialController.createNewsletter);
router.post('/newsletters/:id/send', adminEditorialController.sendNewsletter);
router.post('/newsletters/:id/schedule', adminEditorialController.scheduleNewsletter);

module.exports = router;
