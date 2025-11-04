const mobilePushService = require('../services/mobilePushService');
const deepLinkService = require('../services/deepLinkService');
const offlineCacheService = require('../services/offlineCacheService');
const { validationResult } = require('express-validator');

class MobileController {
  /**
   * Enregistrement d'un token FCM pour les notifications push
   */
  async registerPushToken(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Erreurs de validation',
          errors: errors.array()
        });
      }

      const { token, deviceInfo = {} } = req.body;
      const userId = req.user.id;

      const result = await mobilePushService.registerDeviceToken(userId, token, deviceInfo);

      res.json({
        success: true,
        message: `Token FCM ${result.action === 'created' ? 'enregistré' : 'mis à jour'} avec succès`,
        data: result
      });

    } catch (error) {
      console.error('Erreur enregistrement token push:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Suppression d'un token FCM
   */
  async unregisterPushToken(req, res) {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      const result = await mobilePushService.unregisterDeviceToken(userId, token);

      res.json({
        success: true,
        message: result.message,
        data: result
      });

    } catch (error) {
      console.error('Erreur suppression token push:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Envoi d'une notification push de test
   */
  async sendTestNotification(req, res) {
    try {
      const { title, body, data = {} } = req.body;
      const userId = req.user.id;

      const notification = { title, body };
      const notificationData = {
        type: 'test',
        action: 'open_app',
        ...data
      };

      const result = await mobilePushService.sendToUser(userId, notification, notificationData);

      res.json({
        success: true,
        message: 'Notification de test envoyée',
        data: result
      });

    } catch (error) {
      console.error('Erreur envoi notification test:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Génération d'un deep link pour partage
   */
  async createDeepLink(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Erreurs de validation',
          errors: errors.array()
        });
      }

      const { type, targetId, options = {} } = req.body;
      const userId = req.user?.id;

      let linkResult;

      switch (type) {
        case 'product':
          linkResult = await deepLinkService.createProductLink(targetId, options);
          break;
        case 'store':
          linkResult = await deepLinkService.createStoreLink(targetId, options);
          break;
        case 'order':
          if (!userId) {
            return res.status(401).json({
              success: false,
              message: 'Authentification requise pour les liens de commande'
            });
          }
          linkResult = await deepLinkService.createOrderLink(targetId, userId, options);
          break;
        case 'promo':
          linkResult = await deepLinkService.createPromoLink(targetId, options);
          break;
        case 'referral':
          if (!userId) {
            return res.status(401).json({
              success: false,
              message: 'Authentification requise pour les liens de parrainage'
            });
          }
          linkResult = await deepLinkService.createReferralLink(userId, options);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Type de lien non supporté'
          });
      }

      res.status(201).json({
        success: true,
        message: 'Deep link créé avec succès',
        data: linkResult
      });

    } catch (error) {
      console.error('Erreur création deep link:', error);
      
      if (error.message.includes('non trouvé') || error.message.includes('invalide')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Résolution d'un short link
   */
  async resolveShortLink(req, res) {
    try {
      const { shortCode } = req.params;
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip;

      const result = await deepLinkService.resolveShortLink(shortCode, userAgent, ipAddress);

      if (!result.success) {
        return res.redirect(result.fallback);
      }

      // Redirection selon le type d'appareil
      res.redirect(302, result.redirectUrl);

    } catch (error) {
      console.error('Erreur résolution short link:', error);
      res.redirect(deepLinkService.webFallbackDomain);
    }
  }

  /**
   * Mise en cache des données pour utilisation hors ligne
   */
  async cacheForOffline(req, res) {
    try {
      const { dataType, options = {} } = req.body;
      const userId = req.user.id;

      let result;

      switch (dataType) {
        case 'products':
          result = await offlineCacheService.cacheProducts(userId, options);
          break;
        case 'categories':
          result = await offlineCacheService.cacheCategories(userId, options);
          break;
        case 'profile':
          result = await offlineCacheService.cacheUserProfile(userId);
          break;
        case 'stores':
          result = await offlineCacheService.cachePopularStores(userId, options);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Type de données non supporté pour le cache'
          });
      }

      res.json({
        success: true,
        message: `Données ${dataType} mises en cache avec succès`,
        data: result
      });

    } catch (error) {
      console.error('Erreur mise en cache hors ligne:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Récupération des données en cache
   */
  async getCachedData(req, res) {
    try {
      const { dataType } = req.params;
      const userId = req.user.id;

      const result = await offlineCacheService.getCachedData(userId, dataType);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        metadata: result.metadata
      });

    } catch (error) {
      console.error('Erreur récupération cache:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Synchronisation des changements hors ligne
   */
  async syncOfflineChanges(req, res) {
    try {
      const { changes } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun changement à synchroniser'
        });
      }

      const result = await offlineCacheService.syncOfflineChanges(userId, changes);

      res.json({
        success: true,
        message: `Synchronisation terminée: ${result.successful}/${result.totalChanges} réussies`,
        data: result
      });

    } catch (error) {
      console.error('Erreur synchronisation hors ligne:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Nettoyage du cache utilisateur
   */
  async clearCache(req, res) {
    try {
      const { dataTypes } = req.body;
      const userId = req.user.id;

      const result = await offlineCacheService.clearUserCache(userId, dataTypes);

      res.json({
        success: true,
        message: result.message,
        data: result
      });

    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Statistiques d'utilisation mobile
   */
  async getMobileStats(req, res) {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.query;

      // Statistiques des notifications
      const notificationStats = await mobilePushService.getNotificationStats(parseInt(days));

      // Statistiques du cache
      const cacheStats = await offlineCacheService.getCacheStats(userId, parseInt(days));

      // Analytics des deep links (si l'utilisateur en a créés)
      // On peut ajouter une requête pour récupérer les liens créés par l'utilisateur

      res.json({
        success: true,
        data: {
          notifications: notificationStats,
          cache: cacheStats,
          period: {
            days: parseInt(days),
            startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });

    } catch (error) {
      console.error('Erreur statistiques mobiles:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Configuration Universal Links (iOS) et App Links (Android)
   */
  async getAppSiteAssociation(req, res) {
    try {
      const config = deepLinkService.generateAppleAppSiteAssociation();
      
      res.set('Content-Type', 'application/json');
      res.json(config);

    } catch (error) {
      console.error('Erreur génération Apple App Site Association:', error);
      res.status(500).json({
        error: 'Configuration non disponible'
      });
    }
  }

  /**
   * Configuration Android Asset Links
   */
  async getAssetLinks(req, res) {
    try {
      const config = deepLinkService.generateAssetLinks();
      
      res.set('Content-Type', 'application/json');
      res.json(config);

    } catch (error) {
      console.error('Erreur génération Asset Links:', error);
      res.status(500).json([]);
    }
  }

  /**
   * Notification contextuelle basée sur l'activité utilisateur
   */
  async sendContextualNotification(req, res) {
    try {
      const { notificationType, context } = req.body;
      const userId = req.user.id;

      const result = await mobilePushService.sendContextualNotification(
        notificationType,
        context,
        userId
      );

      res.json({
        success: true,
        message: 'Notification contextuelle envoyée',
        data: result
      });

    } catch (error) {
      console.error('Erreur notification contextuelle:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Préparation de données pour le mode hors ligne selon les préférences
   */
  async prepareOfflineData(req, res) {
    try {
      const userId = req.user.id;
      const { preferences = {} } = req.body;

      const results = {};

      // Cache basique toujours inclus
      const basicCacheTypes = ['categories', 'profile'];
      
      for (const type of basicCacheTypes) {
        try {
          results[type] = await offlineCacheService[`cache${type.charAt(0).toUpperCase()}${type.slice(1)}`](userId);
        } catch (error) {
          console.error(`Erreur cache ${type}:`, error);
          results[type] = { success: false, error: error.message };
        }
      }

      // Cache des produits selon les préférences
      if (preferences.includeProducts !== false) {
        const productOptions = {
          categories: preferences.categories || [],
          priceRange: preferences.priceRange || null,
          location: preferences.location || null,
          limit: preferences.productLimit || 50,
          includeImages: preferences.includeImages !== false,
          includeDetails: preferences.includeDetails !== false
        };

        results.products = await offlineCacheService.cacheProducts(userId, productOptions);
      }

      // Cache des boutiques populaires si demandé
      if (preferences.includeStores) {
        const storeOptions = {
          location: preferences.location || null,
          limit: preferences.storeLimit || 20
        };

        results.stores = await offlineCacheService.cachePopularStores(userId, storeOptions);
      }

      const successful = Object.values(results).filter(r => r.success).length;
      const total = Object.keys(results).length;

      res.json({
        success: true,
        message: `Données hors ligne préparées: ${successful}/${total} types mis en cache`,
        data: {
          results,
          summary: {
            total,
            successful,
            failed: total - successful
          }
        }
      });

    } catch (error) {
      console.error('Erreur préparation données hors ligne:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new MobileController();