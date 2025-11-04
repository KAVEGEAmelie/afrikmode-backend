/**
 * Contrôleur pour la gestion des notifications push
 * Gère l'enregistrement des devices, l'envoi de notifications et le suivi
 */

const notificationService = require('../services/notificationService');
const NotificationTemplates = require('../services/notificationTemplates');
const { validationResult } = require('express-validator');
const db = require('../config/database');

const notificationController = {
  
  /**
   * Enregistrer un token de device
   * POST /api/notifications/device-tokens
   */
  async registerDeviceToken(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const tenantId = req.user.tenant_id;

      const tokenData = {
        userId: userId,
        tenantId: tenantId,
        token: req.body.token,
        tokenType: req.body.tokenType || 'fcm',
        deviceId: req.body.deviceId,
        platform: req.body.platform, // 'android', 'ios', 'web'
        appVersion: req.body.appVersion,
        deviceModel: req.body.deviceModel,
        osVersion: req.body.osVersion,
        language: req.body.language || 'fr',
        timezone: req.body.timezone || 'Africa/Lome',
        notificationsEnabled: req.body.notificationsEnabled !== false,
        notificationPreferences: req.body.notificationPreferences || {
          orders: true,
          promotions: true,
          products: true,
          general: true,
          marketing: false
        },
        locationData: req.body.locationData || {}
      };

      const deviceToken = await notificationService.registerDeviceToken(tokenData);

      res.status(201).json({
        success: true,
        message: 'Token de device enregistré avec succès',
        data: { deviceToken }
      });

    } catch (error) {
      console.error('Erreur enregistrement device token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du token',
        error: error.message
      });
    }
  },

  /**
   * Mettre à jour les préférences de notifications
   * PUT /api/notifications/preferences
   */
  async updateNotificationPreferences(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { deviceId, preferences, notificationsEnabled } = req.body;

      const updated = await db('device_tokens')
        .where({ user_id: userId, device_id: deviceId })
        .update({
          notifications_enabled: notificationsEnabled,
          notification_preferences: JSON.stringify(preferences),
          updated_at: new Date()
        });

      if (updated === 0) {
        return res.status(404).json({
          success: false,
          message: 'Device token non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Préférences mises à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur mise à jour préférences:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour des préférences',
        error: error.message
      });
    }
  },

  /**
   * Envoyer une notification personnalisée (admin uniquement)
   * POST /api/notifications/send
   */
  async sendNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      // Vérifier les permissions admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès interdit - Administrateur requis'
        });
      }

      const notificationData = {
        userId: req.body.userId,
        userIds: req.body.userIds,
        tenantId: req.user.tenant_id,
        createdBy: req.user.id,
        type: req.body.type,
        title: req.body.title,
        body: req.body.body,
        category: req.body.category || 'general',
        priority: req.body.priority || 'normal',
        data: req.body.data || {},
        imageUrl: req.body.imageUrl,
        iconUrl: req.body.iconUrl,
        sound: req.body.sound,
        actionUrl: req.body.actionUrl,
        actions: req.body.actions || [],
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        campaignId: req.body.campaignId
      };

      const result = await notificationService.sendPushNotification(notificationData);

      res.status(201).json({
        success: true,
        message: 'Notification envoyée avec succès',
        data: result
      });

    } catch (error) {
      console.error('Erreur envoi notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de la notification',
        error: error.message
      });
    }
  },

  /**
   * Envoyer une notification avec template
   * POST /api/notifications/send-template
   */
  async sendTemplateNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { templateType, templateData, userId, userIds, language = 'fr' } = req.body;

      // Générer la notification depuis le template
      const templateNotification = NotificationTemplates.generate(templateType, templateData, language);

      const notificationData = {
        ...templateNotification,
        userId: userId,
        userIds: userIds,
        tenantId: req.user.tenant_id,
        createdBy: req.user.id
      };

      const result = await notificationService.sendPushNotification(notificationData);

      res.status(201).json({
        success: true,
        message: 'Notification template envoyée avec succès',
        data: result
      });

    } catch (error) {
      console.error('Erreur envoi notification template:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de la notification template',
        error: error.message
      });
    }
  },

  /**
   * Envoyer une notification broadcast
   * POST /api/notifications/broadcast
   */
  async sendBroadcastNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      // Vérifier les permissions admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès interdit - Administrateur requis'
        });
      }

      const notificationData = {
        tenantId: req.user.tenant_id,
        createdBy: req.user.id,
        type: req.body.type,
        title: req.body.title,
        body: req.body.body,
        category: req.body.category || 'general',
        priority: req.body.priority || 'normal',
        data: req.body.data || {},
        imageUrl: req.body.imageUrl,
        iconUrl: req.body.iconUrl,
        sound: req.body.sound,
        actionUrl: req.body.actionUrl,
        actions: req.body.actions || [],
        campaignId: req.body.campaignId
      };

      const criteria = {
        platform: req.body.targetPlatform,
        userRoles: req.body.targetRoles,
        language: req.body.targetLanguage,
        lastActiveAfter: req.body.lastActiveAfter
      };

      const result = await notificationService.sendBroadcastNotification(notificationData, criteria);

      res.status(201).json({
        success: true,
        message: 'Notification broadcast envoyée avec succès',
        data: result
      });

    } catch (error) {
      console.error('Erreur broadcast notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du broadcast de notification',
        error: error.message
      });
    }
  },

  /**
   * Planifier une notification
   * POST /api/notifications/schedule
   */
  async scheduleNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      // Vérifier les permissions admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès interdit - Administrateur requis'
        });
      }

      const notificationData = {
        userId: req.body.userId,
        userIds: req.body.userIds,
        tenantId: req.user.tenant_id,
        createdBy: req.user.id,
        type: req.body.type,
        title: req.body.title,
        body: req.body.body,
        category: req.body.category || 'general',
        priority: req.body.priority || 'normal',
        data: req.body.data || {},
        imageUrl: req.body.imageUrl,
        actionUrl: req.body.actionUrl,
        campaignId: req.body.campaignId
      };

      const scheduledAt = new Date(req.body.scheduledAt);
      const notification = await notificationService.scheduleNotification(notificationData, scheduledAt);

      res.status(201).json({
        success: true,
        message: 'Notification planifiée avec succès',
        data: { notification }
      });

    } catch (error) {
      console.error('Erreur planification notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la planification',
        error: error.message
      });
    }
  },

  /**
   * Récupérer les notifications d'un utilisateur
   * GET /api/notifications
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        category = null,
        unreadOnly = false
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        category: category,
        unreadOnly: unreadOnly === 'true'
      };

      const result = await notificationService.getUserNotifications(userId, options);

      res.json({
        success: true,
        message: 'Notifications récupérées avec succès',
        data: result
      });

    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des notifications',
        error: error.message
      });
    }
  },

  /**
   * Marquer une notification comme lue
   * PUT /api/notifications/:notificationId/read
   */
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const success = await notificationService.markAsRead(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification non trouvée'
        });
      }

      res.json({
        success: true,
        message: 'Notification marquée comme lue'
      });

    } catch (error) {
      console.error('Erreur marquage lecture notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage comme lu',
        error: error.message
      });
    }
  },

  /**
   * Marquer une notification comme cliquée
   * POST /api/notifications/:notificationId/click
   */
  async markAsClicked(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const success = await notificationService.markAsClicked(notificationId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification non trouvée'
        });
      }

      res.json({
        success: true,
        message: 'Clic enregistré avec succès'
      });

    } catch (error) {
      console.error('Erreur enregistrement clic:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du clic',
        error: error.message
      });
    }
  },

  /**
   * Marquer toutes les notifications comme lues
   * PUT /api/notifications/mark-all-read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      const updated = await db('notifications')
        .where({ user_id: userId })
        .whereNot('status', 'read')
        .update({
          status: 'read',
          read_at: new Date(),
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: `${updated} notification(s) marquée(s) comme lue(s)`
      });

    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage global',
        error: error.message
      });
    }
  },

  /**
   * Obtenir le nombre de notifications non lues
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const result = await db('notifications')
        .where({ user_id: userId })
        .whereNot('status', 'read')
        .count('* as count')
        .first();

      res.json({
        success: true,
        data: {
          unreadCount: parseInt(result.count)
        }
      });

    } catch (error) {
      console.error('Erreur comptage notifications non lues:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du comptage',
        error: error.message
      });
    }
  },

  /**
   * Désactiver un token de device
   * DELETE /api/notifications/device-tokens/:deviceId
   */
  async deactivateDeviceToken(req, res) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const updated = await db('device_tokens')
        .where({ user_id: userId, device_id: deviceId })
        .update({
          is_active: false,
          updated_at: new Date()
        });

      if (updated === 0) {
        return res.status(404).json({
          success: false,
          message: 'Device token non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Device token désactivé avec succès'
      });

    } catch (error) {
      console.error('Erreur désactivation device token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la désactivation',
        error: error.message
      });
    }
  },

  /**
   * Obtenir les statistiques de notifications (admin uniquement)
   * GET /api/notifications/stats
   */
  async getNotificationStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès interdit - Administrateur requis'
        });
      }

      const tenantId = req.user.tenant_id;
      const { period = '7d' } = req.query;

      let dateFilter;
      const now = new Date();
      
      switch (period) {
        case '24h':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Statistiques générales
      const totalNotifications = await db('notifications')
        .where('tenant_id', tenantId)
        .where('created_at', '>=', dateFilter)
        .count('* as count')
        .first();

      const sentNotifications = await db('notifications')
        .where('tenant_id', tenantId)
        .where('created_at', '>=', dateFilter)
        .where('status', 'sent')
        .count('* as count')
        .first();

      const readNotifications = await db('notifications')
        .where('tenant_id', tenantId)
        .where('created_at', '>=', dateFilter)
        .where('status', 'read')
        .count('* as count')
        .first();

      const clickedNotifications = await db('notifications')
        .where('tenant_id', tenantId)
        .where('created_at', '>=', dateFilter)
        .where('clicked', true)
        .count('* as count')
        .first();

      // Répartition par catégorie
      const byCategory = await db('notifications')
        .where('tenant_id', tenantId)
        .where('created_at', '>=', dateFilter)
        .select('category')
        .count('* as count')
        .groupBy('category')
        .orderBy('count', 'desc');

      // Répartition par statut
      const byStatus = await db('notifications')
        .where('tenant_id', tenantId)
        .where('created_at', '>=', dateFilter)
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Devices actifs
      const activeDevices = await db('device_tokens')
        .where('tenant_id', tenantId)
        .where('is_active', true)
        .count('* as count')
        .first();

      res.json({
        success: true,
        data: {
          period: period,
          overview: {
            total: parseInt(totalNotifications.count),
            sent: parseInt(sentNotifications.count),
            read: parseInt(readNotifications.count),
            clicked: parseInt(clickedNotifications.count),
            activeDevices: parseInt(activeDevices.count),
            deliveryRate: totalNotifications.count > 0 ? 
              ((sentNotifications.count / totalNotifications.count) * 100).toFixed(2) : 0,
            openRate: sentNotifications.count > 0 ? 
              ((readNotifications.count / sentNotifications.count) * 100).toFixed(2) : 0,
            clickRate: sentNotifications.count > 0 ? 
              ((clickedNotifications.count / sentNotifications.count) * 100).toFixed(2) : 0
          },
          byCategory: byCategory,
          byStatus: byStatus
        }
      });

    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  },

  /**
   * Test d'envoi de notification
   * POST /api/notifications/test
   */
  async testNotification(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès interdit - Administrateur requis'
        });
      }

      const testNotification = {
        userId: req.user.id,
        tenantId: req.user.tenant_id,
        createdBy: req.user.id,
        type: 'test',
        title: '🧪 Test de notification',
        body: 'Ceci est une notification de test pour vérifier le bon fonctionnement du système.',
        category: 'test',
        priority: 'normal',
        data: { test: true },
        actionUrl: '/notifications'
      };

      const result = await notificationService.sendPushNotification(testNotification);

      res.json({
        success: true,
        message: 'Notification de test envoyée',
        data: result
      });

    } catch (error) {
      console.error('Erreur test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du test',
        error: error.message
      });
    }
  }

};

module.exports = notificationController;