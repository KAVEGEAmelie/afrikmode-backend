/**
 * Routes des produits vendeur
 */

const express = require('express');
const router = express.Router();
const {
  getVendorProducts,
  getVendorProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getStockAlerts,
  bulkUpdateProducts
} = require('../controllers/vendorProductsController');
const { requireAuth, requireVendorRole } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification et le rôle vendeur
router.use(requireAuth);
router.use(requireVendorRole);

/**
 * @swagger
 * /api/vendor/products:
 *   get:
 *     summary: Obtenir tous les produits du vendeur
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, draft, inactive]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Liste des produits
 *   post:
 *     summary: Créer un nouveau produit
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Produit créé avec succès
 */
router.route('/')
  .get(getVendorProducts)
  .post(createProduct);

/**
 * @swagger
 * /api/vendor/products/stock-alerts:
 *   get:
 *     summary: Obtenir les produits avec stock faible
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *         description: Seuil de stock (défaut 10)
 *     responses:
 *       200:
 *         description: Liste des produits avec stock faible
 */
router.get('/stock-alerts', getStockAlerts);

/**
 * @swagger
 * /api/vendor/products/bulk-update:
 *   post:
 *     summary: Mettre à jour plusieurs produits en masse
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Produits mis à jour avec succès
 */
router.post('/bulk-update', bulkUpdateProducts);

/**
 * @swagger
 * /api/vendor/products/{id}:
 *   get:
 *     summary: Obtenir un produit spécifique
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du produit
 *   put:
 *     summary: Mettre à jour un produit
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produit mis à jour avec succès
 *   delete:
 *     summary: Supprimer un produit
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Produit supprimé avec succès
 */
router.route('/:id')
  .get(getVendorProduct)
  .put(updateProduct)
  .delete(deleteProduct);

/**
 * @swagger
 * /api/vendor/products/{id}/toggle-status:
 *   patch:
 *     summary: Activer/Désactiver un produit
 *     tags: [Vendor Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statut du produit modifié
 */
router.patch('/:id/toggle-status', toggleProductStatus);

module.exports = router;
