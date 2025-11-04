const admin = require('firebase-admin');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Configuration Firebase Admin (nécessite le fichier de clé de service)
try {
  if (!admin.apps.length) {
    const serviceAccount = require('../../config/firebase-service-account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log('✅ Firebase Admin initialisé avec succès');
  }
} catch (error) {
  console.warn('⚠️ Firebase Admin non configuré - notifications push désactivées');
  console.warn('Créer le fichier config/firebase-service-account.json pour activer');
}

class MobilePushService {
  constructor() {
    this.messaging = admin.apps.length > 0 ? admin.messaging() : null;
    this.isConfigured = !!this.messaging;
  }

  /**
   * Envoi d'une notification push à un utilisateur spécifique
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      if (!this.isConfigured) {
        console.warn('Firebase non configuré - notification ignorée');
        return { success: false, error: 'Firebase non configuré' };
      }

      // Récupérer les tokens FCM de l'utilisateur
      const deviceTokens = await this.getUserDeviceTokens(userId);
      
      if (deviceTokens.length === 0) {
        console.warn(`Aucun token FCM trouvé pour l'utilisateur ${userId}`);
        return { success: false, error: 'Aucun appareil enregistré' };
      }

      // Construire le message
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image || null
        },
        data: {
          type: data.type || 'general',
          action: data.action || '',
          payload: JSON.stringify(data.payload || {}),
          deep_link: data.deep_link || '',
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35', // Couleur principale AfrikMode
            sound: 'default',
            channelId: 'afrikmode_channel'
          },
          data: data
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: await this.getUserUnreadCount(userId)
            }
          },
          fcmOptions: {
            imageUrl: notification.image || null
          }
        },
        tokens: deviceTokens
      };

      // Envoi via Firebase
      const response = await this.messaging.sendEachForMulticast(message);

      // Traiter les résultats
      const results = await this.processNotificationResults(
        userId, 
        deviceTokens, 
        response, 
        notification, 
        data
      );

      // Enregistrer la notification en base
      await this.saveNotificationLog({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        type: data.type || 'general',
        data: JSON.stringify(data),
        sent_count: results.successCount,
        failed_count: results.failureCount,
        status: results.successCount > 0 ? 'sent' : 'failed'
      });

      return {
        success: results.successCount > 0,
        successCount: results.successCount,
        failureCount: results.failureCount,
        results: results.details
      };

    } catch (error) {
      console.error('Erreur envoi notification push:', error);
      throw error;
    }
  }

  /**
   * Envoi en masse à plusieurs utilisateurs
   */
  async sendToMultipleUsers(userIds, notification, data = {}) {
    try {
      const results = [];
      
      // Traitement par batch de 500 utilisateurs (limite FCM)
      const batchSize = 500;
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(userId => 
          this.sendToUser(userId, notification, data)
            .catch(error => ({ 
              userId, 
              success: false, 
              error: error.message 
            }))
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const summary = {
        total: userIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
      };

      return summary;

    } catch (error) {
      console.error('Erreur envoi notifications en masse:', error);
      throw error;
    }
  }

  /**
   * Envoi par segmentation (par rôle, localisation, etc.)
   */
  async sendToSegment(segmentCriteria, notification, data = {}) {
    try {
      // Construire la requête de segmentation
      let query = db('users').select('id');

      if (segmentCriteria.role) {
        query = query.where('role', segmentCriteria.role);
      }

      if (segmentCriteria.location) {
        query = query.where('location', 'ilike', `%${segmentCriteria.location}%`);
      }

      if (segmentCriteria.lastActiveAfter) {
        query = query.where('last_active_at', '>=', segmentCriteria.lastActiveAfter);
      }

      if (segmentCriteria.registeredAfter) {
        query = query.where('created_at', '>=', segmentCriteria.registeredAfter);
      }

      if (segmentCriteria.hasOrders) {
        query = query.whereExists(function() {
          this.select('*').from('orders').whereRaw('orders.user_id = users.id');
        });
      }

      const users = await query;
      const userIds = users.map(user => user.id);

      if (userIds.length === 0) {
        return {
          success: true,
          message: 'Aucun utilisateur correspondant au segment',
          total: 0,
          successful: 0,
          failed: 0
        };
      }

      // Envoi aux utilisateurs du segment
      const results = await this.sendToMultipleUsers(userIds, notification, data);

      return {
        success: true,
        segment: segmentCriteria,
        ...results
      };

    } catch (error) {
      console.error('Erreur envoi notification par segment:', error);
      throw error;
    }
  }

  /**
   * Notifications contextuelle (commande, produit, etc.)
   */
  async sendContextualNotification(type, context, userId) {
    try {
      const notifications = {
        order_confirmed: {
          title: '✅ Commande confirmée',
          body: `Votre commande #${context.orderNumber} a été confirmée`,
          data: {
            type: 'order',
            action: 'view_order',
            deep_link: `afrikmode://order/${context.orderId}`,
            payload: { orderId: context.orderId }
          }
        },
        order_shipped: {
          title: '🚚 Commande expédiée',
          body: `Votre commande #${context.orderNumber} est en route`,
          data: {
            type: 'order',
            action: 'track_order',
            deep_link: `afrikmode://order/${context.orderId}/tracking`,
            payload: { orderId: context.orderId, trackingNumber: context.trackingNumber }
          }
        },
        order_delivered: {
          title: '📦 Commande livrée',
          body: `Votre commande #${context.orderNumber} a été livrée`,
          data: {
            type: 'order',
            action: 'rate_order',
            deep_link: `afrikmode://order/${context.orderId}/review`,
            payload: { orderId: context.orderId }
          }
        },
        payment_success: {
          title: '💳 Paiement réussi',
          body: `Paiement de ${context.amount} ${context.currency} effectué`,
          data: {
            type: 'payment',
            action: 'view_receipt',
            deep_link: `afrikmode://payment/${context.paymentId}`,
            payload: { paymentId: context.paymentId }
          }
        },
        product_back_in_stock: {
          title: '🎉 Produit disponible',
          body: `"${context.productName}" est de retour en stock`,
          data: {
            type: 'product',
            action: 'view_product',
            deep_link: `afrikmode://product/${context.productId}`,
            payload: { productId: context.productId }
          }
        },
        price_drop: {
          title: '💰 Baisse de prix',
          body: `"${context.productName}" est maintenant à ${context.newPrice}`,
          data: {
            type: 'product',
            action: 'view_product',
            deep_link: `afrikmode://product/${context.productId}`,
            payload: { productId: context.productId, oldPrice: context.oldPrice, newPrice: context.newPrice }
          }
        },
        store_promotion: {
          title: '🔥 Promotion spéciale',
          body: `${context.discount}% de réduction chez ${context.storeName}`,
          data: {
            type: 'promotion',
            action: 'view_store',
            deep_link: `afrikmode://store/${context.storeId}/promotions`,
            payload: { storeId: context.storeId, promoCode: context.promoCode }
          }
        },
        new_message: {
          title: '💬 Nouveau message',
          body: context.preview || 'Vous avez reçu un nouveau message',
          data: {
            type: 'message',
            action: 'view_conversation',
            deep_link: `afrikmode://chat/${context.conversationId}`,
            payload: { conversationId: context.conversationId, senderId: context.senderId }
          }
        }
      };

      const notificationConfig = notifications[type];
      if (!notificationConfig) {
        throw new Error(`Type de notification inconnu: ${type}`);
      }

      return await this.sendToUser(userId, notificationConfig, notificationConfig.data);

    } catch (error) {
      console.error(`Erreur notification contextuelle ${type}:`, error);
      throw error;
    }
  }

  /**
   * Enregistrement d'un token FCM pour un appareil
   */
  async registerDeviceToken(userId, token, deviceInfo = {}) {
    try {
      const deviceId = deviceInfo.deviceId || this.generateDeviceId(deviceInfo);
      
      // Vérifier si le token existe déjà
      const existing = await db('user_device_tokens')
        .where({ user_id: userId, token })
        .first();

      if (existing) {
        // Mettre à jour les informations de l'appareil
        await db('user_device_tokens')
          .where('id', existing.id)
          .update({
            device_info: JSON.stringify(deviceInfo),
            last_used_at: new Date(),
            updated_at: new Date()
          });
        
        return { success: true, action: 'updated', tokenId: existing.id };
      }

      // Créer un nouveau token
      const tokenRecord = {
        id: uuidv4(),
        user_id: userId,
        token,
        device_id: deviceId,
        platform: deviceInfo.platform || 'unknown',
        app_version: deviceInfo.appVersion || '1.0.0',
        device_info: JSON.stringify(deviceInfo),
        is_active: true,
        last_used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('user_device_tokens').insert(tokenRecord);

      return { success: true, action: 'created', tokenId: tokenRecord.id };

    } catch (error) {
      console.error('Erreur enregistrement token FCM:', error);
      throw error;
    }
  }

  /**
   * Suppression d'un token FCM
   */
  async unregisterDeviceToken(userId, token) {
    try {
      const deleted = await db('user_device_tokens')
        .where({ user_id: userId, token })
        .del();

      return { 
        success: deleted > 0, 
        message: deleted > 0 ? 'Token supprimé' : 'Token non trouvé' 
      };

    } catch (error) {
      console.error('Erreur suppression token FCM:', error);
      throw error;
    }
  }

  /**
   * Nettoyage des tokens invalides
   */
  async cleanupInvalidTokens() {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours
      
      const deletedCount = await db('user_device_tokens')
        .where('last_used_at', '<', cutoffDate)
        .orWhere('is_active', false)
        .del();

      console.log(`🧹 Nettoyage tokens FCM: ${deletedCount} tokens supprimés`);
      
      return { success: true, deletedCount };

    } catch (error) {
      console.error('Erreur nettoyage tokens FCM:', error);
      throw error;
    }
  }

  /**
   * Statistiques des notifications
   */
  async getNotificationStats(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await db('push_notification_logs')
        .select(
          db.raw('COUNT(*) as total_sent'),
          db.raw('SUM(sent_count) as total_delivered'),
          db.raw('SUM(failed_count) as total_failed'),
          db.raw('COUNT(DISTINCT user_id) as unique_recipients')
        )
        .where('created_at', '>=', startDate)
        .first();

      const byType = await db('push_notification_logs')
        .select('type', db.raw('COUNT(*) as count'))
        .where('created_at', '>=', startDate)
        .groupBy('type')
        .orderBy('count', 'desc');

      const deviceStats = await db('user_device_tokens')
        .select('platform', db.raw('COUNT(*) as count'))
        .where('is_active', true)
        .groupBy('platform');

      return {
        period: { days, startDate: startDate.toISOString() },
        overview: stats,
        byType,
        byPlatform: deviceStats
      };

    } catch (error) {
      console.error('Erreur statistiques notifications:', error);
      throw error;
    }
  }

  // Méthodes utilitaires privées

  async getUserDeviceTokens(userId) {
    const tokens = await db('user_device_tokens')
      .where({ user_id: userId, is_active: true })
      .pluck('token');
    
    return tokens;
  }

  async getUserUnreadCount(userId) {
    const unreadCount = await db('notifications')
      .where({ user_id: userId, read_at: null })
      .count('* as count')
      .first();
    
    return parseInt(unreadCount.count) || 0;
  }

  async processNotificationResults(userId, tokens, response, notification, data) {
    const results = {
      successCount: response.successCount,
      failureCount: response.failureCount,
      details: []
    };

    // Traiter les tokens invalides
    for (let i = 0; i < response.responses.length; i++) {
      const result = response.responses[i];
      const token = tokens[i];

      if (!result.success) {
        const errorCode = result.error?.code;
        
        // Marquer les tokens invalides comme inactifs
        if (errorCode === 'messaging/invalid-registration-token' || 
            errorCode === 'messaging/registration-token-not-registered') {
          
          await db('user_device_tokens')
            .where({ user_id: userId, token })
            .update({ is_active: false, updated_at: new Date() });
        }

        results.details.push({
          token: token.substring(0, 20) + '...',
          success: false,
          error: result.error?.message || 'Erreur inconnue'
        });
      } else {
        results.details.push({
          token: token.substring(0, 20) + '...',
          success: true,
          messageId: result.messageId
        });
      }
    }

    return results;
  }

  async saveNotificationLog(logData) {
    const record = {
      id: uuidv4(),
      ...logData,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await db('push_notification_logs').insert(record);
  }

  generateDeviceId(deviceInfo) {
    const identifier = `${deviceInfo.platform || 'unknown'}-${deviceInfo.model || 'unknown'}-${Date.now()}`;
    return identifier.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}

module.exports = new MobilePushService();