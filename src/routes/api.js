const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  ApiController,
  createWebhookValidation,
  updateWebhookValidation,
  generateApiKeyValidation
} = require('../controllers/apiController');

const router = express.Router();

// ================= WEBHOOKS =================

// Créer un webhook
router.post('/webhooks', requireAuth, createWebhookValidation, ApiController.createWebhook);

// Récupérer tous les webhooks
router.get('/webhooks', requireAuth, ApiController.getUserWebhooks);

// Récupérer un webhook spécifique
router.get('/webhooks/:webhookId', requireAuth, updateWebhookValidation, ApiController.getWebhook);

// Mettre à jour un webhook
router.put('/webhooks/:webhookId', requireAuth, updateWebhookValidation, ApiController.updateWebhook);

// Supprimer un webhook
router.delete('/webhooks/:webhookId', requireAuth, updateWebhookValidation, ApiController.deleteWebhook);

// Tester un webhook
router.post('/webhooks/:webhookId/test', requireAuth, updateWebhookValidation, ApiController.testWebhook);

// Historique des livraisons d'un webhook
router.get('/webhooks/:webhookId/deliveries', requireAuth, updateWebhookValidation, ApiController.getWebhookDeliveries);

// Types d'événements disponibles
router.get('/webhooks/events/types', requireAuth, ApiController.getEventTypes);

// ================= CLÉS API =================

// Générer une nouvelle clé API
router.post('/keys', requireAuth, generateApiKeyValidation, ApiController.generateApiKey);

// Récupérer toutes les clés API
router.get('/keys', requireAuth, ApiController.getApiKeys);

// Révoquer une clé API
router.delete('/keys/:keyId', requireAuth, ApiController.revokeApiKey);

// ================= RATE LIMITING =================

// Limites de taux actuelles
router.get('/rate-limits', ApiController.getApiRateLimits);

// Utilisation actuelle de l'API
router.get('/usage', ApiController.getApiUsage);

// ================= DOCUMENTATION & INFO =================

// Informations générales de l'API
router.get('/info', ApiController.getApiInfo);

// Health check
router.get('/health', ApiController.healthCheck);

module.exports = router;