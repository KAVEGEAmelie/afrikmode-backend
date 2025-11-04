/**
 * Routes pour la gestion des coupons de réduction
 * Définit tous les endpoints pour créer, valider et gérer les coupons
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const couponController = require('../controllers/couponController');

// Note: L'authentification est déjà gérée au niveau du routeur principal

/**
 * @route   POST /api/coupons
 * @desc    Créer un nouveau coupon (Admin seulement)
 * @access  Private (Admin)
 */
router.post('/', [
  body('code')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Le code doit contenir entre 3 et 50 caractères')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Le code ne peut contenir que des lettres majuscules, chiffres, tirets et underscores'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  
  body('type')
    .isIn(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y', 'category_discount'])
    .withMessage('Type de coupon invalide'),
  
  body('value')
    .isFloat({ min: 0 })
    .withMessage('La valeur doit être un nombre positif'),
  
  body('start_date')
    .isISO8601()
    .withMessage('Date de début invalide'),
  
  body('end_date')
    .isISO8601()
    .withMessage('Date de fin invalide')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.start_date)) {
        throw new Error('La date de fin doit être postérieure à la date de début');
      }
      return true;
    }),
  
  body('min_order_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant minimum doit être positif'),
  
  body('max_discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant maximum de réduction doit être positif'),
  
  body('usage_limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La limite d\'utilisation doit être un entier positif'),
  
  body('usage_limit_per_user')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La limite par utilisateur doit être un entier positif'),
  
  body('allowed_user_roles')
    .optional()
    .isArray()
    .withMessage('Les rôles autorisés doivent être un tableau'),
  
  body('included_product_ids')
    .optional()
    .isArray()
    .withMessage('Les produits inclus doivent être un tableau'),
  
  body('excluded_product_ids')
    .optional()
    .isArray()
    .withMessage('Les produits exclus doivent être un tableau'),
  
  body('included_category_ids')
    .optional()
    .isArray()
    .withMessage('Les catégories incluses doivent être un tableau'),
  
  body('excluded_category_ids')
    .optional()
    .isArray()
    .withMessage('Les catégories exclues doivent être un tableau'),
  
  body('buy_x_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La quantité X doit être un entier positif'),
  
  body('get_y_quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La quantité Y doit être un entier positif'),

  body('shipping_zone_ids')
    .optional()
    .isArray()
    .withMessage('Les zones de livraison doivent être un tableau')
], couponController.createCoupon);

/**
 * @route   GET /api/coupons
 * @desc    Récupérer tous les coupons avec pagination et filtres (Admin seulement)
 * @access  Private (Admin)
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le numéro de page doit être un entier positif'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),
  
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active doit être un booléen'),
  
  query('type')
    .optional()
    .isIn(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y', 'category_discount'])
    .withMessage('Type de coupon invalide'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Le terme de recherche doit contenir entre 1 et 100 caractères')
], couponController.getCoupons);

/**
 * @route   GET /api/coupons/:id
 * @desc    Récupérer un coupon par son ID (Admin seulement)
 * @access  Private (Admin)
 */
router.get('/:id', [
  param('id')
    .isUUID()
    .withMessage('ID de coupon invalide')
], couponController.getCouponById);

/**
 * @route   POST /api/coupons/validate
 * @desc    Valider un code de coupon
 * @access  Private (Tous utilisateurs authentifiés)
 */
router.post('/validate', [
  body('code')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Code de coupon invalide'),
  
  body('subtotal')
    .isFloat({ min: 0 })
    .withMessage('Le sous-total doit être un nombre positif'),
  
  body('total')
    .isFloat({ min: 0 })
    .withMessage('Le total doit être un nombre positif'),
  
  body('shipping_cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le coût de livraison doit être un nombre positif'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Les articles doivent être un tableau non vide'),
  
  body('items.*.product_id')
    .isUUID()
    .withMessage('ID de produit invalide'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La quantité doit être un entier positif'),
  
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif')
], couponController.validateCouponCode);

/**
 * @route   POST /api/coupons/apply
 * @desc    Appliquer un coupon à une commande
 * @access  Private (Tous utilisateurs authentifiés)
 */
router.post('/apply', [
  body('couponCode')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Code de coupon invalide'),
  
  body('orderData')
    .isObject()
    .withMessage('Données de commande requises'),
  
  body('orderData.subtotal')
    .isFloat({ min: 0 })
    .withMessage('Sous-total invalide'),
  
  body('orderData.total')
    .isFloat({ min: 0 })
    .withMessage('Total invalide'),
  
  body('orderData.items')
    .isArray({ min: 1 })
    .withMessage('Articles requis')
], couponController.applyCouponToOrder);

/**
 * @route   PUT /api/coupons/:id
 * @desc    Mettre à jour un coupon (Admin seulement)
 * @access  Private (Admin)
 */
router.put('/:id', [
  param('id')
    .isUUID()
    .withMessage('ID de coupon invalide'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  
  body('description')
    .optional()
    .trim(),
  
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La valeur doit être un nombre positif'),
  
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Date de début invalide'),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Date de fin invalide'),
  
  body('min_order_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant minimum doit être positif'),
  
  body('max_discount_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le montant maximum de réduction doit être positif'),
  
  body('usage_limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La limite d\'utilisation doit être un entier positif'),
  
  body('usage_limit_per_user')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La limite par utilisateur doit être un entier positif')
], couponController.updateCoupon);

/**
 * @route   PATCH /api/coupons/:id/toggle
 * @desc    Activer/Désactiver un coupon (Admin seulement)
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', [
  param('id')
    .isUUID()
    .withMessage('ID de coupon invalide'),
  
  body('is_active')
    .isBoolean()
    .withMessage('Le statut doit être un booléen')
], couponController.toggleCouponStatus);

/**
 * @route   DELETE /api/coupons/:id
 * @desc    Supprimer un coupon (Admin seulement)
 * @access  Private (Admin)
 */
router.delete('/:id', [
  param('id')
    .isUUID()
    .withMessage('ID de coupon invalide')
], couponController.deleteCoupon);

/**
 * @route   GET /api/coupons/:id/stats
 * @desc    Obtenir les statistiques d'utilisation d'un coupon (Admin seulement)
 * @access  Private (Admin)
 */
router.get('/:id/stats', [
  param('id')
    .isUUID()
    .withMessage('ID de coupon invalide')
], couponController.getCouponStats);

/**
 * @route   GET /api/coupons/user/history
 * @desc    Obtenir l'historique d'utilisation des coupons par l'utilisateur
 * @access  Private (Tous utilisateurs authentifiés)
 */
router.get('/user/history', couponController.getUserCouponHistory);

module.exports = router;