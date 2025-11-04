const express = require('express');
const router = express.Router();
const adminCategoryController = require('../../controllers/admin/adminCategoryController');
const { requireAuth, requireAdminRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireAdminRole);

router.get('/', adminCategoryController.getCategories);
router.get('/stats', adminCategoryController.getCategoriesStats);
router.get('/root', adminCategoryController.getRootCategories);
router.post('/', adminCategoryController.createCategory);
router.post('/reorder', adminCategoryController.reorderCategories);
router.get('/:id', adminCategoryController.getCategoryById);
router.put('/:id', adminCategoryController.updateCategory);
router.delete('/:id', adminCategoryController.deleteCategory);
router.patch('/:id/toggle-status', adminCategoryController.toggleCategoryStatus);
router.get('/:id/subcategories', adminCategoryController.getSubcategories);

module.exports = router;
