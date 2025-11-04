/**
 * Service de notifications push
 * Gère l'envoi de notifications via Firebase Cloud Messaging (FCM) et OneSignal
 * Supporte Android, iOS et Web push notifications
 */

const admin = require('firebase-admin');
const axios = require('axios');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class NotificationService {
  
  constructor() {
    this.fcm = null;
    this.oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
    this.oneSignalAppId = process.env.ONESIGNAL_APP_ID;
    
    this.initializeFirebase();
  }

  /**
   * Initialiser Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      let serviceAccount = null;
      
      // Option A: Variable d'environnement JSON
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      }
      // Option B: Fichier JSON  
      else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      
      if (serviceAccount && !admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        
        this.fcm = admin.messaging();
        console.log('✅ Firebase Cloud Messaging initialisé');
      }
    } catch (error) {
      console.warn('⚠️ Firebase non configuré:', error.message);
    }
  }

  /**
   * Enregistrer un token de device
   */
  async registerDeviceToken(tokenData) {
    try {
      const deviceToken = {
        id: uuidv4(),
        user_id: tokenData.userId,
        token: tokenData.token,
        token_type: tokenData.tokenType || 'fcm',
        device_id: tokenData.deviceId,
        platform: tokenData.platform,
        app_version: tokenData.appVersion,
        device_model: tokenData.deviceModel,
        os_version: tokenData.osVersion,
        language: tokenData.language || 'fr',
        notifications_enabled: tokenData.notificationsEnabled !== false,
        notification_preferences: JSON.stringify(tokenData.notificationPreferences || {}),
        timezone: tokenData.timezone || 'Africa/Lome',
        location_data: JSON.stringify(tokenData.locationData || {}),
        tenant_id: tokenData.tenantId
      };

      // Désactiver les anciens tokens pour ce device
      await db('device_tokens')
        .where({ user_id: tokenData.userId, device_id: tokenData.deviceId })
        .update({ is_active: false });

      // Insérer le nouveau token
      const [newToken] = await db('device_tokens')
        .insert(deviceToken)
        .returning('*');

      return this.formatDeviceToken(newToken);

    } catch (error) {
      throw new Error(`Erreur lors de l'enregistrement du token: ${error.message}`);
    }
  }

  /**
   * Envoyer une notification push
   */
  async sendPushNotification(notificationData) {
    try {
      // Créer l'entrée dans la base de données
      const notification = await this.createNotification(notificationData);

      // Récupérer les tokens des destinataires
      const deviceTokens = await this.getDeviceTokens(notificationData.userIds || [notificationData.userId]);

      if (deviceTokens.length === 0) {
        await this.updateNotificationStatus(notification.id, 'failed', 'Aucun token de device trouvé');
        return { success: false, message: 'Aucun device token trouvé' };
      }

      // Grouper par type de token
      const fcmTokens = deviceTokens.filter(t => t.token_type === 'fcm');
      const oneSignalTokens = deviceTokens.filter(t => t.token_type === 'onesignal');

      const results = [];

      // Envoyer via Firebase FCM
      if (fcmTokens.length > 0) {
        const fcmResult = await this.sendViaFirebase(notification, fcmTokens);
        results.push(fcmResult);
      }

      // Envoyer via OneSignal
      if (oneSignalTokens.length > 0) {
        const oneSignalResult = await this.sendViaOneSignal(notification, oneSignalTokens);
        results.push(oneSignalResult);
      }

      // Mettre à jour le statut
      const overallSuccess = results.some(r => r.success);
      await this.updateNotificationStatus(
        notification.id, 
        overallSuccess ? 'sent' : 'failed',
        JSON.stringify(results)
      );

      return {
        success: overallSuccess,
        notificationId: notification.id,
        results: results
      };

    } catch (error) {
      console.error('Erreur envoi notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer via Firebase Cloud Messaging
   */
  async sendViaFirebase(notification, tokens) {
    if (!this.fcm) {
      return { success: false, error: 'Firebase non configuré' };
    }

    try {
      const tokenStrings = tokens.map(t => t.token);
      
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image_url
        },
        data: {
          ...notification.data,
          notificationId: notification.id,
          type: notification.type,
          category: notification.category,
          actionUrl: notification.action_url || ''
        },
        tokens: tokenStrings,
        android: {
          notification: {
            icon: notification.icon_url || 'ic_notification',
            color: '#8B2E2E', // Couleur AfrikMode
            sound: notification.sound || 'default',
            clickAction: notification.action_url,
            priority: this.mapPriorityToAndroid(notification.priority)
          },
          data: {
            click_action: notification.action_url || 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: notification.sound || 'default',
              badge: 1,
              category: notification.category
            }
          },
          fcmOptions: {
            imageUrl: notification.image_url
          }
        },
        webpush: {
          notification: {
            icon: notification.icon_url || '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            image: notification.image_url,
            requireInteraction: notification.priority === 'high' || notification.priority === 'urgent',
            actions: notification.actions || []
          },
          fcmOptions: {
            link: notification.action_url
          }
        }
      };

      const response = await this.fcm.sendMulticast(message);

      // Traiter les réponses individuelles
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: tokenStrings[idx],
            error: resp.error.message
          });
          
          // Désactiver le token si erreur permanente
          if (this.isTokenInvalid(resp.error)) {
            this.deactivateToken(tokenStrings[idx]);
          }
        }
      });

      return {
        success: response.successCount > 0,
        platform: 'firebase',
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens: failedTokens
      };

    } catch (error) {
      console.error('Erreur Firebase FCM:', error);
      return {
        success: false,
        platform: 'firebase',
        error: error.message
      };
    }
  }

  /**
   * Envoyer via OneSignal
   */
  async sendViaOneSignal(notification, tokens) {
    if (!this.oneSignalApiKey || !this.oneSignalAppId) {
      return { success: false, error: 'OneSignal non configuré' };
    }

    try {
      const playerIds = tokens.map(t => t.token);

      const payload = {
        app_id: this.oneSignalAppId,
        include_player_ids: playerIds,
        headings: { fr: notification.title, en: notification.title },
        contents: { fr: notification.body, en: notification.body },
        data: {
          ...notification.data,
          notificationId: notification.id,
          type: notification.type,
          category: notification.category,
          actionUrl: notification.action_url || ''
        },
        url: notification.action_url,
        big_picture: notification.image_url,
        large_icon: notification.icon_url,
        small_icon: 'ic_notification',
        android_accent_color: 'FF8B2E2E',
        priority: this.mapPriorityToOneSignal(notification.priority),
        android_visibility: 1,
        ios_sound: notification.sound || 'default',
        android_sound: notification.sound || 'default',
        web_push_topic: notification.category
      };

      // Ajouter les actions si présentes
      if (notification.actions && notification.actions.length > 0) {
        payload.buttons = notification.actions.map(action => ({
          id: action.id,
          text: action.text,
          url: action.url
        }));
      }

      const response = await axios.post('https://onesignal.com/api/v1/notifications', payload, {
        headers: {
          'Authorization': `Basic ${this.oneSignalApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        platform: 'onesignal',
        response: response.data,
        recipients: response.data.recipients
      };

    } catch (error) {
      console.error('Erreur OneSignal:', error.response?.data || error.message);
      return {
        success: false,
        platform: 'onesignal',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Envoyer une notification à tous les utilisateurs (broadcast)
   */
  async sendBroadcastNotification(notificationData, criteria = {}) {
    try {
      // Récupérer tous les utilisateurs selon les critères
      let query = db('device_tokens')
        .join('users', 'device_tokens.user_id', 'users.id')
        .where('device_tokens.is_active', true)
        .where('device_tokens.notifications_enabled', true)
        .where('device_tokens.tenant_id', notificationData.tenantId);

      // Appliquer les filtres
      if (criteria.platform) {
        query = query.where('device_tokens.platform', criteria.platform);
      }

      if (criteria.userRoles) {
        query = query.whereIn('users.role', criteria.userRoles);
      }

      if (criteria.language) {
        query = query.where('device_tokens.language', criteria.language);
      }

      if (criteria.lastActiveAfter) {
        query = query.where('device_tokens.last_active_at', '>=', criteria.lastActiveAfter);
      }

      const userIds = await query.distinct('device_tokens.user_id').pluck('device_tokens.user_id');

      if (userIds.length === 0) {
        return { success: false, message: 'Aucun utilisateur correspondant aux critères' };
      }

      // Créer un batch ID pour le suivi
      const batchId = uuidv4();
      notificationData.batchId = batchId;

      // Envoyer par lots pour éviter la surcharge
      const batchSize = 1000;
      const results = [];

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const result = await this.sendPushNotification({
          ...notificationData,
          userIds: batch
        });
        results.push(result);
      }

      return {
        success: true,
        batchId: batchId,
        totalUsers: userIds.length,
        batchResults: results
      };

    } catch (error) {
      throw new Error(`Erreur lors du broadcast: ${error.message}`);
    }
  }

  /**
   * Planifier une notification
   */
  async scheduleNotification(notificationData, scheduledAt) {
    try {
      const notification = await this.createNotification({
        ...notificationData,
        isScheduled: true,
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled'
      });

      // TODO: Implémenter avec un job scheduler (comme Bull Queue)
      // Pour l'instant, on stocke juste en base
      
      return notification;

    } catch (error) {
      throw new Error(`Erreur lors de la planification: ${error.message}`);
    }
  }

  /**
   * Créer une notification en base de données
   */
  async createNotification(data) {
    try {
      const notification = {
        id: uuidv4(),
        user_id: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: JSON.stringify(data.data || {}),
        category: data.category,
        priority: data.priority || 'normal',
        image_url: data.imageUrl,
        icon_url: data.iconUrl,
        sound: data.sound || 'default',
        display_options: JSON.stringify(data.displayOptions || {}),
        action_url: data.actionUrl,
        actions: JSON.stringify(data.actions || []),
        scheduled_at: data.scheduledAt,
        expires_at: data.expiresAt,
        is_scheduled: data.isScheduled || false,
        status: data.status || 'draft',
        target_criteria: JSON.stringify(data.targetCriteria || {}),
        campaign_id: data.campaignId,
        batch_id: data.batchId,
        related_order_id: data.relatedOrderId,
        related_product_id: data.relatedProductId,
        related_coupon_id: data.relatedCouponId,
        related_ticket_id: data.relatedTicketId,
        tenant_id: data.tenantId,
        created_by: data.createdBy
      };

      const [newNotification] = await db('notifications')
        .insert(notification)
        .returning('*');

      return this.formatNotification(newNotification);

    } catch (error) {
      throw new Error(`Erreur lors de la création de la notification: ${error.message}`);
    }
  }

  /**
   * Récupérer les tokens de devices pour des utilisateurs
   */
  async getDeviceTokens(userIds) {
    try {
      return await db('device_tokens')
        .whereIn('user_id', userIds)
        .where('is_active', true)
        .where('notifications_enabled', true);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des tokens: ${error.message}`);
    }
  }

  /**
   * Mettre à jour le statut d'une notification
   */
  async updateNotificationStatus(notificationId, status, deliveryDetails = null) {
    try {
      const updateData = {
        status: status,
        updated_at: new Date()
      };

      if (status === 'sent') {
        updateData.sent_at = new Date();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date();
      } else if (status === 'read') {
        updateData.read_at = new Date();
      }

      if (deliveryDetails) {
        updateData.delivery_details = JSON.stringify(deliveryDetails);
      }

      await db('notifications')
        .where('id', notificationId)
        .update(updateData);

    } catch (error) {
      console.error('Erreur mise à jour statut notification:', error);
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId, userId) {
    try {
      const updated = await db('notifications')
        .where({ id: notificationId, user_id: userId })
        .update({
          status: 'read',
          read_at: new Date(),
          updated_at: new Date()
        });

      return updated > 0;
    } catch (error) {
      throw new Error(`Erreur lors du marquage comme lu: ${error.message}`);
    }
  }

  /**
   * Marquer une notification comme cliquée
   */
  async markAsClicked(notificationId, userId) {
    try {
      await db('notifications')
        .where({ id: notificationId, user_id: userId })
        .update({
          clicked: true,
          clicked_at: new Date(),
          updated_at: new Date()
        })
        .increment('click_count', 1);

      return true;
    } catch (error) {
      console.error('Erreur marquage clic notification:', error);
      return false;
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category = null,
        unreadOnly = false
      } = options;

      let query = db('notifications')
        .where('user_id', userId)
        .orderBy('created_at', 'desc');

      if (category) {
        query = query.where('category', category);
      }

      if (unreadOnly) {
        query = query.where('status', '!=', 'read');
      }

      const offset = (page - 1) * limit;
      const total = await query.clone().count('* as count').first();
      
      const notifications = await query
        .limit(limit)
        .offset(offset);

      return {
        notifications: notifications.map(n => this.formatNotification(n)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          totalPages: Math.ceil(total.count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des notifications: ${error.message}`);
    }
  }

  /**
   * Désactiver un token invalide
   */
  async deactivateToken(token) {
    try {
      await db('device_tokens')
        .where('token', token)
        .update({ 
          is_active: false, 
          updated_at: new Date() 
        })
        .increment('failed_attempts', 1);
    } catch (error) {
      console.error('Erreur désactivation token:', error);
    }
  }

  /**
   * Utilitaires
   */
  
  isTokenInvalid(error) {
    const invalidErrorCodes = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token'
    ];
    return invalidErrorCodes.includes(error.code);
  }

  mapPriorityToAndroid(priority) {
    const mapping = {
      'low': 'min',
      'normal': 'default',
      'high': 'high',
      'urgent': 'max'
    };
    return mapping[priority] || 'default';
  }

  mapPriorityToOneSignal(priority) {
    const mapping = {
      'low': 1,
      'normal': 5,
      'high': 8,
      'urgent': 10
    };
    return mapping[priority] || 5;
  }

  formatDeviceToken(token) {
    return {
      ...token,
      notification_preferences: JSON.parse(token.notification_preferences || '{}'),
      location_data: JSON.parse(token.location_data || '{}')
    };
  }

  formatNotification(notification) {
    return {
      ...notification,
      data: JSON.parse(notification.data || '{}'),
      display_options: JSON.parse(notification.display_options || '{}'),
      actions: JSON.parse(notification.actions || '[]'),
      target_criteria: JSON.parse(notification.target_criteria || '{}'),
      delivery_details: JSON.parse(notification.delivery_details || '{}'),
      interaction_data: JSON.parse(notification.interaction_data || '{}')
    };
  }
}

module.exports = new NotificationService();
