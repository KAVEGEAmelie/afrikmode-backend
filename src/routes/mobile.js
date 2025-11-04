const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');
const { requireAuth: authenticate, optionalAuth: optional } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation pour l'enregistrement de token FCM
const registerTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token FCM requis')
    .isLength({ min: 20 })
    .withMessage('Token FCM invalide'),
  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('deviceInfo doit être un objet'),
  body('deviceInfo.platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Plateforme invalide'),
  body('deviceInfo.appVersion')
    .optional()
    .isString()
    .withMessage('Version d\'application invalide')
];

// Validation pour la création de deep link
const createDeepLinkValidation = [
  body('type')
    .isIn(['product', 'store', 'order', 'promo', 'referral'])
    .withMessage('Type de lien invalide'),
  body('targetId')
    .notEmpty()
    .withMessage('ID cible requis'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options doivent être un objet')
];

// Validation pour le cache hors ligne
const cacheDataValidation = [
  body('dataType')
    .isIn(['products', 'categories', 'profile', 'stores'])
    .withMessage('Type de données invalide'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options doivent être un objet')
];

// Validation pour la synchronisation
const syncChangesValidation = [
  body('changes')
    .isArray({ min: 1 })
    .withMessage('Liste de changements requise'),
  body('changes.*.id')
    .notEmpty()
    .withMessage('ID de changement requis'),
  body('changes.*.type')
    .isIn(['wishlist_add', 'wishlist_remove', 'cart_update', 'profile_update', 'address_add'])
    .withMessage('Type de changement invalide'),
  body('changes.*.data')
    .isObject()
    .withMessage('Données de changement requises')
];

// Validation pour notification contextuelle
const contextualNotificationValidation = [
  body('notificationType')
    .isIn(['order_confirmed', 'order_shipped', 'order_delivered', 'payment_success', 'product_back_in_stock', 'price_drop', 'store_promotion', 'new_message'])
    .withMessage('Type de notification invalide'),
  body('context')
    .isObject()
    .withMessage('Contexte requis')
];

/**
 * @swagger
 * tags:
 *   name: Mobile
 *   description: Fonctionnalités mobiles (Push notifications, Deep linking, Cache hors ligne)
 */

// === NOTIFICATIONS PUSH ===

/**
 * @swagger
 * /api/mobile/push/register:
 *   post:
 *     summary: Enregistrement d'un token FCM pour les notifications push
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token FCM de l'appareil
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   platform:
 *                     type: string
 *                     enum: [ios, android, web]
 *                   appVersion:
 *                     type: string
 *                   deviceId:
 *                     type: string
 *                   model:
 *                     type: string
 *     responses:
 *       200:
 *         description: Token enregistré avec succès
 *       400:
 *         description: Erreurs de validation
 */
router.post('/push/register', 
  authenticate, 
  registerTokenValidation, 
  mobileController.registerPushToken
);

/**
 * @swagger
 * /api/mobile/push/unregister:
 *   post:
 *     summary: Suppression d'un token FCM
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token FCM à supprimer
 *     responses:
 *       200:
 *         description: Token supprimé avec succès
 */
router.post('/push/unregister', 
  authenticate, 
  body('token').notEmpty().withMessage('Token requis'),
  mobileController.unregisterPushToken
);

/**
 * @swagger
 * /api/mobile/push/test:
 *   post:
 *     summary: Envoi d'une notification push de test
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 *                 description: Données additionnelles
 *     responses:
 *       200:
 *         description: Notification envoyée
 */
router.post('/push/test', 
  authenticate,
  body('title').notEmpty().withMessage('Titre requis'),
  body('body').notEmpty().withMessage('Corps du message requis'),
  mobileController.sendTestNotification
);

/**
 * @swagger
 * /api/mobile/push/contextual:
 *   post:
 *     summary: Envoi d'une notification contextuelle
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationType
 *               - context
 *             properties:
 *               notificationType:
 *                 type: string
 *                 enum: [order_confirmed, order_shipped, order_delivered, payment_success, product_back_in_stock, price_drop, store_promotion, new_message]
 *               context:
 *                 type: object
 *                 description: Contexte spécifique au type de notification
 *     responses:
 *       200:
 *         description: Notification contextuelle envoyée
 */
router.post('/push/contextual', 
  authenticate,
  contextualNotificationValidation,
  mobileController.sendContextualNotification
);

// === DEEP LINKING ===

/**
 * @swagger
 * /api/mobile/deeplink/create:
 *   post:
 *     summary: Création d'un deep link pour partage
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - targetId
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [product, store, order, promo, referral]
 *               targetId:
 *                 type: string
 *                 description: ID de la ressource cible
 *               options:
 *                 type: object
 *                 properties:
 *                   campaign:
 *                     type: string
 *                   utm_source:
 *                     type: string
 *                   utm_medium:
 *                     type: string
 *                   expiresAt:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       201:
 *         description: Deep link créé avec succès
 *       404:
 *         description: Ressource cible non trouvée
 */
router.post('/deeplink/create', 
  optional, // Authentification optionnelle selon le type
  createDeepLinkValidation, 
  mobileController.createDeepLink
);

/**
 * @swagger
 * /l/{shortCode}:
 *   get:
 *     summary: Résolution d'un short link (redirection)
 *     tags: [Mobile]
 *     parameters:
 *       - name: shortCode
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 6
 *           maxLength: 10
 *     responses:
 *       302:
 *         description: Redirection vers l'application ou le web
 *       404:
 *         description: Lien non trouvé
 */
router.get('/l/:shortCode', 
  param('shortCode').isLength({ min: 6, max: 10 }).withMessage('Code de lien invalide'),
  mobileController.resolveShortLink
);

// === CACHE HORS LIGNE ===

/**
 * @swagger
 * /api/mobile/offline/cache:
 *   post:
 *     summary: Mise en cache de données pour utilisation hors ligne
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataType
 *             properties:
 *               dataType:
 *                 type: string
 *                 enum: [products, categories, profile, stores]
 *               options:
 *                 type: object
 *                 description: Options spécifiques au type de données
 *     responses:
 *       200:
 *         description: Données mises en cache avec succès
 */
router.post('/offline/cache', 
  authenticate, 
  cacheDataValidation, 
  mobileController.cacheForOffline
);

/**
 * @swagger
 * /api/mobile/offline/cache/{dataType}:
 *   get:
 *     summary: Récupération des données en cache
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dataType
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, categories, profile, stores]
 *     responses:
 *       200:
 *         description: Données en cache récupérées
 *       404:
 *         description: Aucune donnée en cache
 */
router.get('/offline/cache/:dataType', 
  authenticate,
  param('dataType').isIn(['products', 'categories', 'profile', 'stores']).withMessage('Type de données invalide'),
  mobileController.getCachedData
);

/**
 * @swagger
 * /api/mobile/offline/sync:
 *   post:
 *     summary: Synchronisation des changements effectués hors ligne
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - changes
 *             properties:
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - type
 *                     - data
 *                   properties:
 *                     id:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [wishlist_add, wishlist_remove, cart_update, profile_update, address_add]
 *                     data:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *     responses:
 *       200:
 *         description: Changements synchronisés avec succès
 */
router.post('/offline/sync', 
  authenticate, 
  syncChangesValidation, 
  mobileController.syncOfflineChanges
);

/**
 * @swagger
 * /api/mobile/offline/clear:
 *   post:
 *     summary: Nettoyage du cache utilisateur
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dataTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [products, categories, profile, stores]
 *                 description: Types de données à nettoyer (tous si non spécifié)
 *     responses:
 *       200:
 *         description: Cache nettoyé avec succès
 */
router.post('/offline/clear', 
  authenticate,
  body('dataTypes').optional().isArray().withMessage('dataTypes doit être un tableau'),
  mobileController.clearCache
);

/**
 * @swagger
 * /api/mobile/offline/prepare:
 *   post:
 *     summary: Préparation de données pour le mode hors ligne selon les préférences
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *                 properties:
 *                   includeProducts:
 *                     type: boolean
 *                     default: true
 *                   includeStores:
 *                     type: boolean
 *                     default: false
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                   priceRange:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                       max:
 *                         type: number
 *                   productLimit:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 200
 *                     default: 50
 *                   includeImages:
 *                     type: boolean
 *                     default: true
 *                   includeDetails:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Données préparées selon les préférences
 */
router.post('/offline/prepare', 
  authenticate,
  body('preferences').optional().isObject().withMessage('Préférences doivent être un objet'),
  mobileController.prepareOfflineData
);

// === STATISTIQUES ET MONITORING ===

/**
 * @swagger
 * /api/mobile/stats:
 *   get:
 *     summary: Statistiques d'utilisation des fonctionnalités mobiles
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 7
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 */
router.get('/stats', 
  authenticate,
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Nombre de jours invalide'),
  mobileController.getMobileStats
);

// === CONFIGURATION APP LINKS ===

/**
 * @swagger
 * /.well-known/apple-app-site-association:
 *   get:
 *     summary: Configuration Universal Links pour iOS
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Configuration Apple App Site Association
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/.well-known/apple-app-site-association', mobileController.getAppSiteAssociation);

/**
 * @swagger
 * /.well-known/assetlinks.json:
 *   get:
 *     summary: Configuration Digital Asset Links pour Android
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Configuration Android Asset Links
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 */
router.get('/.well-known/assetlinks.json', mobileController.getAssetLinks);

module.exports = router;