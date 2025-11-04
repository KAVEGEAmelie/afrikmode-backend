const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  NewsletterController,
  createTemplateValidation,
  updateTemplateValidation,
  createCampaignValidation,
  updateCampaignValidation,
  scheduleCampaignValidation,
  createTemplate,
  getTemplates,
  initializeDefaultTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  scheduleCampaign,
  cancelScheduledCampaign,
  previewCampaign,
  getCampaignStats,
  getOverallStats,
  getSegments,
  handleEmailWebhook
} = require('../controllers/newsletterController');

const router = express.Router();

// ================= ROUTES TEMPLATES =================

// Créer un template
router.post('/templates', requireAuth, createTemplateValidation, createTemplate);

// Récupérer tous les templates
router.get('/templates', requireAuth, getTemplates);

// Initialiser les templates par défaut
router.post('/templates/initialize', requireAuth, initializeDefaultTemplates);

// Récupérer un template spécifique
router.get('/templates/:templateId', requireAuth, updateTemplateValidation, getTemplate);

// Mettre à jour un template
router.put('/templates/:templateId', requireAuth, updateTemplateValidation, updateTemplate);

// Supprimer un template
router.delete('/templates/:templateId', requireAuth, updateTemplateValidation, deleteTemplate);

// Prévisualiser un template
router.post('/templates/:templateId/preview', requireAuth, updateTemplateValidation, previewTemplate);

// ================= ROUTES CAMPAGNES =================

// Créer une campagne
router.post('/campaigns', requireAuth, createCampaignValidation, createCampaign);

// Récupérer toutes les campagnes
router.get('/campaigns', requireAuth, getCampaigns);

// Récupérer une campagne spécifique
router.get('/campaigns/:campaignId', requireAuth, updateCampaignValidation, getCampaign);

// Mettre à jour une campagne
router.put('/campaigns/:campaignId', requireAuth, updateCampaignValidation, updateCampaign);

// Supprimer une campagne
router.delete('/campaigns/:campaignId', requireAuth, updateCampaignValidation, deleteCampaign);

// Envoyer une campagne
router.post('/campaigns/:campaignId/send', requireAuth, updateCampaignValidation, sendCampaign);

// Programmer une campagne
router.post('/campaigns/:campaignId/schedule', requireAuth, scheduleCampaignValidation, scheduleCampaign);

// Annuler une campagne programmée
router.post('/campaigns/:campaignId/cancel', requireAuth, updateCampaignValidation, cancelScheduledCampaign);

// Prévisualiser une campagne
router.post('/campaigns/:campaignId/preview', requireAuth, updateCampaignValidation, previewCampaign);

// ================= ROUTES ANALYTICS =================

// Statistiques d'une campagne
router.get('/campaigns/:campaignId/stats', requireAuth, updateCampaignValidation, getCampaignStats);

// Statistiques globales
router.get('/stats', requireAuth, getOverallStats);

// ================= ROUTES SEGMENTS =================

// Récupérer les segments
router.get('/segments', requireAuth, getSegments);

// ================= WEBHOOKS =================

// Webhook pour les événements email (sans authentification pour les fournisseurs externes)
router.post('/webhooks/email', handleEmailWebhook);

module.exports = router;