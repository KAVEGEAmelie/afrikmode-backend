const webhookService = require('../services/webhookService');
// const { validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');

/**
 * Contrôleur pour les APIs avancées (Webhooks, Rate Limiting)
 */
class ApiController {

  // ================= GESTION DES WEBHOOKS =================

  /**
   * Crée un nouveau webhook
   */
  async createWebhook(req, res) {
    try {
      const webhook = await webhookService.registerWebhook(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Webhook créé avec succès',
        data: webhook
      });
    } catch (error) {
      console.error('Erreur création webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Met à jour un webhook existant
   */
  async updateWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const webhook = await webhookService.updateWebhook(webhookId, req.body, req.user.id);
      
      res.json({
        success: true,
        message: 'Webhook mis à jour avec succès',
        data: webhook
      });
    } catch (error) {
      console.error('Erreur mise à jour webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Supprime un webhook
   */
  async deleteWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const deleted = await webhookService.deleteWebhook(webhookId, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }
      
      res.json({
        success: true,
        message: 'Webhook supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupère tous les webhooks de l'utilisateur
   */
  async getUserWebhooks(req, res) {
    try {
      const webhooks = await webhookService.getUserWebhooks(req.user.id);
      
      res.json({
        success: true,
        data: webhooks
      });
    } catch (error) {
      console.error('Erreur récupération webhooks:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des webhooks'
      });
    }
  }

  /**
   * Récupère un webhook spécifique
   */
  async getWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const webhook = await webhookService.getWebhook(webhookId, req.user.id);
      
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }
      
      res.json({
        success: true,
        data: webhook
      });
    } catch (error) {
      console.error('Erreur récupération webhook:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Teste un webhook
   */
  async testWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const result = await webhookService.testWebhook(webhookId, req.user.id);
      
      res.json({
        success: true,
        message: 'Test webhook envoyé',
        data: result
      });
    } catch (error) {
      console.error('Erreur test webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupère l'historique des livraisons d'un webhook
   */
  async getWebhookDeliveries(req, res) {
    try {
      const { webhookId } = req.params;
      const { limit = 50 } = req.query;
      
      const deliveries = await webhookService.getDeliveryHistory(
        webhookId, 
        req.user.id, 
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: deliveries
      });
    } catch (error) {
      console.error('Erreur récupération historique webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupère les types d'événements disponibles
   */
  async getEventTypes(req, res) {
    try {
      const eventTypes = webhookService.eventTypes;
      
      res.json({
        success: true,
        data: {
          event_types: Object.entries(eventTypes).map(([key, value]) => ({
            key,
            value,
            description: this.getEventDescription(value)
          }))
        }
      });
    } catch (error) {
      console.error('Erreur récupération types événements:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des types d\'événements'
      });
    }
  }

  /**
   * Décrit un type d'événement
   */
  getEventDescription(eventType) {
    const descriptions = {
      'order.created': 'Déclenché quand une nouvelle commande est créée',
      'order.updated': 'Déclenché quand une commande est mise à jour',
      'order.cancelled': 'Déclenché quand une commande est annulée',
      'order.completed': 'Déclenché quand une commande est terminée/livrée',
      'product.created': 'Déclenché quand un nouveau produit est créé',
      'product.updated': 'Déclenché quand un produit est mis à jour',
      'product.deleted': 'Déclenché quand un produit est supprimé',
      'product.out_of_stock': 'Déclenché quand un produit n\'est plus en stock',
      'user.registered': 'Déclenché quand un nouvel utilisateur s\'inscrit',
      'user.updated': 'Déclenché quand un utilisateur met à jour son profil',
      'payment.completed': 'Déclenché quand un paiement est confirmé',
      'payment.failed': 'Déclenché quand un paiement échoue',
      'review.created': 'Déclenché quand un nouvel avis est créé',
      'store.created': 'Déclenché quand une nouvelle boutique est créée',
      'store.updated': 'Déclenché quand une boutique est mise à jour'
    };

    return descriptions[eventType] || 'Description non disponible';
  }

  // ================= RATE LIMITING PUBLIC =================

  /**
   * Récupère les limites de taux pour l'API publique
   */
  async getApiRateLimits(req, res) {
    try {
      // Configuration des limites selon la clé API ou l'authentification
      const rateLimits = {
        authenticated: {
          requests_per_minute: 1000,
          requests_per_hour: 50000,
          requests_per_day: 500000
        },
        unauthenticated: {
          requests_per_minute: 100,
          requests_per_hour: 5000,
          requests_per_day: 50000
        },
        api_key: {
          requests_per_minute: 2000,
          requests_per_hour: 100000,
          requests_per_day: 1000000
        }
      };

      const userType = req.headers['x-api-key'] ? 'api_key' : 
                      req.user ? 'authenticated' : 'unauthenticated';

      res.json({
        success: true,
        data: {
          current_type: userType,
          limits: rateLimits[userType],
          all_limits: rateLimits
        }
      });
    } catch (error) {
      console.error('Erreur récupération limites API:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des limites'
      });
    }
  }

  /**
   * Récupère l'utilisation actuelle de l'API
   */
  async getApiUsage(req, res) {
    try {
      // Simuler les statistiques d'utilisation
      // En production, ces données viendraient d'un système de monitoring
      const usage = {
        current_minute: {
          requests: Math.floor(Math.random() * 100),
          limit: 1000
        },
        current_hour: {
          requests: Math.floor(Math.random() * 5000),
          limit: 50000
        },
        current_day: {
          requests: Math.floor(Math.random() * 50000),
          limit: 500000
        },
        reset_times: {
          minute: new Date(Date.now() + (60 - new Date().getSeconds()) * 1000),
          hour: new Date(Date.now() + (60 - new Date().getMinutes()) * 60000),
          day: new Date(new Date().setHours(23, 59, 59, 999))
        }
      };

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Erreur récupération utilisation API:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'utilisation'
      });
    }
  }

  // ================= CLÉS API =================

  /**
   * Génère une nouvelle clé API
   */
  async generateApiKey(req, res) {
    try {
      const { name, permissions = [] } = req.body;
      
      // Générer une clé API
      const crypto = require('crypto');
      const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
      
      // Enregistrer en base
      const db = require('../config/database');
      const [key] = await db('api_keys').insert({
        name,
        key: apiKey,
        permissions: JSON.stringify(permissions),
        user_id: req.user.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');

      res.status(201).json({
        success: true,
        message: 'Clé API générée avec succès',
        data: {
          ...key,
          permissions: JSON.parse(key.permissions)
        }
      });
    } catch (error) {
      console.error('Erreur génération clé API:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de la clé API'
      });
    }
  }

  /**
   * Récupère toutes les clés API de l'utilisateur
   */
  async getApiKeys(req, res) {
    try {
      const db = require('../config/database');
      const keys = await db('api_keys')
        .where('user_id', req.user.id)
        .select('id', 'name', 'permissions', 'is_active', 'created_at', 'last_used_at')
        .orderBy('created_at', 'desc');

      res.json({
        success: true,
        data: keys.map(key => ({
          ...key,
          permissions: JSON.parse(key.permissions || '[]')
        }))
      });
    } catch (error) {
      console.error('Erreur récupération clés API:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des clés API'
      });
    }
  }

  /**
   * Révoque une clé API
   */
  async revokeApiKey(req, res) {
    try {
      const { keyId } = req.params;
      const db = require('../config/database');
      
      const updated = await db('api_keys')
        .where('id', keyId)
        .where('user_id', req.user.id)
        .update({
          is_active: false,
          updated_at: new Date()
        });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Clé API non trouvée'
        });
      }

      res.json({
        success: true,
        message: 'Clé API révoquée avec succès'
      });
    } catch (error) {
      console.error('Erreur révocation clé API:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la révocation de la clé API'
      });
    }
  }

  // ================= DOCUMENTATION API =================

  /**
   * Récupère les informations générales de l'API
   */
  async getApiInfo(req, res) {
    try {
      const apiInfo = {
        name: 'AfrikMode API',
        version: '1.0.0',
        description: 'API REST et GraphQL pour la plateforme AfrikMode',
        base_url: `${req.protocol}://${req.get('host')}/api`,
        graphql_url: `${req.protocol}://${req.get('host')}/graphql`,
        documentation_url: `${req.protocol}://${req.get('host')}/api/docs`,
        authentication: {
          types: ['Bearer Token', 'API Key'],
          endpoints: {
            login: '/api/auth/login',
            register: '/api/auth/register',
            refresh: '/api/auth/refresh'
          }
        },
        rate_limits: {
          default: '1000 requests/hour',
          authenticated: '50000 requests/hour',
          api_key: '100000 requests/hour'
        },
        supported_formats: ['JSON'],
        webhooks: {
          supported: true,
          events: Object.keys(webhookService.eventTypes).length,
          endpoint: '/api/advanced/webhooks'
        }
      };

      res.json({
        success: true,
        data: apiInfo
      });
    } catch (error) {
      console.error('Erreur récupération info API:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations'
      });
    }
  }

  /**
   * Endpoint de santé pour monitoring
   */
  async healthCheck(req, res) {
    try {
      const db = require('../config/database');
      
      // Test de connexion base de données
      await db.raw('SELECT 1');
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'operational',
          webhooks: 'operational',
          api: 'operational'
        },
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        version: '1.0.0'
      };

      res.json(health);
    } catch (error) {
      console.error('Erreur health check:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

// Validations pour les webhooks
const createWebhookValidation = [
  body('name')
    .notEmpty()
    .withMessage('Le nom du webhook est requis')
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('url')
    .notEmpty()
    .withMessage('L\'URL du webhook est requise')
    .isURL()
    .withMessage('URL invalide'),
  body('events')
    .isArray({ min: 1 })
    .withMessage('Au moins un événement doit être spécifié'),
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }
    next();
  }
];

const updateWebhookValidation = [
  param('webhookId').notEmpty().withMessage('ID webhook requis'),
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validations pour les clés API
const generateApiKeyValidation = [
  body('name')
    .notEmpty()
    .withMessage('Le nom de la clé API est requis')
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom doit contenir entre 3 et 50 caractères'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Les permissions doivent être un tableau'),
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  ApiController: new ApiController(),
  createWebhookValidation,
  updateWebhookValidation,
  generateApiKeyValidation
};