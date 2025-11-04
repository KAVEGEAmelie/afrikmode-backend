/**
 * Routes pour la gestion des notifications push
 * Endpoints pour l'enregistrement des devices, envoi de notifications et suivi
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth: auth } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

/**
 * Validation pour l'enregistrement d'un device token
 */
const validateDeviceToken = [
  body('token')
    .notEmpty()
    .withMessage('Token requis')
    .isLength({ min: 10 })
    .withMessage('Token invalide'),
  
  body('deviceId')
    .notEmpty()
    .withMessage('ID de device requis'),
  
  body('platform')
    .isIn(['android', 'ios', 'web'])
    .withMessage('Platform doit être: android, ios ou web'),
  
  body('tokenType')
    .optional()
    .isIn(['fcm', 'onesignal', 'apns'])
    .withMessage('Type de token doit être: fcm, onesignal ou apns'),
  
  body('language')
    .optional()
    .isIn(['fr', 'en'])
    .withMessage('Langue doit être: fr ou en'),
  
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone invalide'),
  
  body('notificationPreferences')
    .optional()
    .isObject()
    .withMessage('Préférences de notification invalides')
];

/**
 * Validation pour les préférences de notifications
 */
const validateNotificationPreferences = [
  body('deviceId')
    .notEmpty()
    .withMessage('ID de device requis'),
  
  body('notificationsEnabled')
    .isBoolean()
    .withMessage('notificationsEnabled doit être un booléen'),
  
  body('preferences')
    .isObject()
    .withMessage('Préférences invalides')
];

/**
 * Validation pour l'envoi de notifications
 */
const validateSendNotification = [
  body('title')
    .notEmpty()
    .withMessage('Titre requis')
    .isLength({ max: 100 })
    .withMessage('Titre trop long (max 100 caractères)'),
  
  body('body')
    .notEmpty()
    .withMessage('Corps du message requis')
    .isLength({ max: 500 })
    .withMessage('Corps trop long (max 500 caractères)'),
  
  body('type')
    .notEmpty()
    .withMessage('Type de notification requis'),
  
  body('category')
    .optional()
    .isIn(['order', 'payment', 'product', 'promotion', 'cart', 'review', 'welcome', 'event', 'general', 'test'])
    .withMessage('Catégorie invalide'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priorité invalide'),
  
  body('userId')
    .optional()
    .isUUID()
    .withMessage('ID utilisateur invalide'),
  
  body('userIds')
    .optional()
    .isArray()
    .withMessage('Liste d\'IDs utilisateur invalide'),
  
  body('userIds.*')
    .optional()
    .isUUID()
    .withMessage('ID utilisateur invalide dans la liste'),
  
  body('actionUrl')
    .optional()
    .isURL()
    .withMessage('URL d\'action invalide'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Date d\'expiration invalide')
];

/**
 * Validation pour les notifications template
 */
const validateTemplateNotification = [
  body('templateType')
    .notEmpty()
    .withMessage('Type de template requis')
    .isIn([
      'order_confirmed',
      'order_status_update',
      'coupon_available',
      'coupon_expiring',
      'new_product',
      'back_in_stock',
      'product_sale',
      'cart_abandonment',
      'payment_failed',
      'payment_success',
      'review_request',
      'user_welcome',
      'special_event'
    ])
    .withMessage('Type de template invalide'),
  
  body('templateData')
    .isObject()
    .withMessage('Données de template invalides'),
  
  body('language')
    .optional()
    .isIn(['fr', 'en'])
    .withMessage('Langue invalide'),
  
  body('userId')
    .optional()
    .isUUID()
    .withMessage('ID utilisateur invalide'),
  
  body('userIds')
    .optional()
    .isArray()
    .withMessage('Liste d\'IDs utilisateur invalide')
];

/**
 * Validation pour les notifications broadcast
 */
const validateBroadcastNotification = [
  ...validateSendNotification,
  
  body('targetPlatform')
    .optional()
    .isIn(['android', 'ios', 'web'])
    .withMessage('Plateforme cible invalide'),
  
  body('targetRoles')
    .optional()
    .isArray()
    .withMessage('Rôles cibles invalides'),
  
  body('targetLanguage')
    .optional()
    .isIn(['fr', 'en'])
    .withMessage('Langue cible invalide'),
  
  body('lastActiveAfter')
    .optional()
    .isISO8601()
    .withMessage('Date de dernière activité invalide')
];

/**
 * Validation pour la planification de notifications
 */
const validateScheduleNotification = [
  ...validateSendNotification,
  
  body('scheduledAt')
    .notEmpty()
    .withMessage('Date de planification requise')
    .isISO8601()
    .withMessage('Date de planification invalide')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('La date de planification doit être dans le futur');
      }
      return true;
    })
];

/**
 * Validation pour les paramètres de requête
 */
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide (1-100)'),
  
  query('category')
    .optional()
    .isIn(['order', 'payment', 'product', 'promotion', 'cart', 'review', 'welcome', 'event', 'general', 'test'])
    .withMessage('Catégorie invalide'),
  
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly doit être un booléen')
];

const validateStatsQuery = [
  query('period')
    .optional()
    .isIn(['24h', '7d', '30d'])
    .withMessage('Période invalide (24h, 7d, 30d)')
];

// ==========================================
// ROUTES PUBLIQUES (avec authentification)
// ==========================================

/**
 * @route   POST /api/notifications/device-tokens
 * @desc    Enregistrer un token de device pour les notifications push
 * @access  Private (utilisateur connecté)
 */
router.post('/device-tokens', auth, validateDeviceToken, notificationController.registerDeviceToken);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Mettre à jour les préférences de notifications
 * @access  Private (utilisateur connecté)
 */
router.put('/preferences', auth, validateNotificationPreferences, notificationController.updateNotificationPreferences);

/**
 * @route   GET /api/notifications
 * @desc    Récupérer les notifications de l'utilisateur connecté
 * @access  Private (utilisateur connecté)
 */
router.get('/', auth, validatePaginationQuery, notificationController.getUserNotifications);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Marquer une notification comme lue
 * @access  Private (utilisateur connecté)
 */
router.put('/:notificationId/read', auth, [
  param('notificationId').isUUID().withMessage('ID notification invalide')
], notificationController.markAsRead);

/**
 * @route   POST /api/notifications/:notificationId/click
 * @desc    Marquer une notification comme cliquée (pour analytics)
 * @access  Private (utilisateur connecté)
 */
router.post('/:notificationId/click', auth, [
  param('notificationId').isUUID().withMessage('ID notification invalide')
], notificationController.markAsClicked);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Marquer toutes les notifications comme lues
 * @access  Private (utilisateur connecté)
 */
router.put('/mark-all-read', auth, notificationController.markAllAsRead);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Obtenir le nombre de notifications non lues
 * @access  Private (utilisateur connecté)
 */
router.get('/unread-count', auth, notificationController.getUnreadCount);

/**
 * @route   DELETE /api/notifications/device-tokens/:deviceId
 * @desc    Désactiver un token de device
 * @access  Private (utilisateur connecté)
 */
router.delete('/device-tokens/:deviceId', auth, [
  param('deviceId').notEmpty().withMessage('ID device requis')
], notificationController.deactivateDeviceToken);

// ==========================================
// ROUTES ADMIN
// ==========================================

/**
 * @route   POST /api/notifications/send
 * @desc    Envoyer une notification personnalisée (admin uniquement)
 * @access  Private (admin uniquement)
 */
router.post('/send', auth, validateSendNotification, notificationController.sendNotification);

/**
 * @route   POST /api/notifications/send-template
 * @desc    Envoyer une notification avec template prédéfini
 * @access  Private (admin et système)
 */
router.post('/send-template', auth, validateTemplateNotification, notificationController.sendTemplateNotification);

/**
 * @route   POST /api/notifications/broadcast
 * @desc    Envoyer une notification broadcast à plusieurs utilisateurs (admin uniquement)
 * @access  Private (admin uniquement)
 */
router.post('/broadcast', auth, validateBroadcastNotification, notificationController.sendBroadcastNotification);

/**
 * @route   POST /api/notifications/schedule
 * @desc    Planifier une notification pour envoi différé (admin uniquement)
 * @access  Private (admin uniquement)
 */
router.post('/schedule', auth, validateScheduleNotification, notificationController.scheduleNotification);

/**
 * @route   GET /api/notifications/stats
 * @desc    Obtenir les statistiques de notifications (admin uniquement)
 * @access  Private (admin uniquement)
 */
router.get('/stats', auth, validateStatsQuery, notificationController.getNotificationStats);

/**
 * @route   POST /api/notifications/test
 * @desc    Envoyer une notification de test (admin uniquement)
 * @access  Private (admin uniquement)
 */
router.post('/test', auth, notificationController.testNotification);

module.exports = router;