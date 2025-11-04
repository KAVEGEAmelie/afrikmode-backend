const express = require('express');
const router = express.Router();
const { requireAuth, requireVendorRole } = require('../../middleware/auth');
const vendorProductsController = require('../../controllers/vendorProductsController');

/**
 * VENDOR PRODUCTS ROUTES
 * Base path: /api/vendor/products
 * 
 * All routes require authentication and vendor role
 */

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireVendorRole);

// Product CRUD Operations
router.get('/', vendorProductsController.getProducts);
router.get('/:id', vendorProductsController.getProductById);
router.post('/', vendorProductsController.createProduct);
router.put('/:id', vendorProductsController.updateProduct);
router.delete('/:id', vendorProductsController.deleteProduct);

// Product Status Management
router.put('/:id/status', vendorProductsController.updateProductStatus);
router.put('/:id/featured', vendorProductsController.toggleFeatured);
router.put('/:id/visibility', vendorProductsController.updateVisibility);

// Product Images
router.post('/:id/images', vendorProductsController.uploadProductImages);
router.put('/:id/images/:imageId', vendorProductsController.updateProductImage);
router.delete('/:id/images/:imageId', vendorProductsController.deleteProductImage);
router.put('/:id/images/:imageId/primary', vendorProductsController.setPrimaryImage);

// Product Categories
router.get('/:id/categories', vendorProductsController.getProductCategories);
router.put('/:id/categories', vendorProductsController.updateProductCategories);

// Product Variants
router.get('/:id/variants', vendorProductsController.getProductVariants);
router.post('/:id/variants', vendorProductsController.createProductVariant);
router.put('/:id/variants/:variantId', vendorProductsController.updateProductVariant);
router.delete('/:id/variants/:variantId', vendorProductsController.deleteProductVariant);

// Product SEO
router.get('/:id/seo', vendorProductsController.getProductSEO);
router.put('/:id/seo', vendorProductsController.updateProductSEO);

// Product Analytics
router.get('/:id/analytics', vendorProductsController.getProductAnalytics);
router.get('/:id/views', vendorProductsController.getProductViews);
router.get('/:id/sales', vendorProductsController.getProductSales);

// Bulk Operations
router.post('/bulk/update', vendorProductsController.bulkUpdateProducts);
router.post('/bulk/delete', vendorProductsController.bulkDeleteProducts);
router.post('/bulk/status', vendorProductsController.bulkUpdateStatus);

// Product Import/Export
router.post('/import', vendorProductsController.importProducts);
router.get('/export', vendorProductsController.exportProducts);

// Product Search & Filter
router.get('/search', vendorProductsController.searchProducts);
router.get('/filter', vendorProductsController.filterProducts);

// Product Reviews (from vendor perspective)
router.get('/:id/reviews', vendorProductsController.getProductReviews);
router.put('/:id/reviews/:reviewId/status', vendorProductsController.updateReviewStatus);

module.exports = router;
