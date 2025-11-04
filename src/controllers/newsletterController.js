const emailCampaignService = require('../services/emailCampaignService');
const emailTemplateService = require('../services/emailTemplateService');
const customerSegmentationService = require('../services/customerSegmentationService');
// const { validateRequest } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

/**
 * Contrôleur pour la gestion des newsletters et campagnes marketing
 */
class NewsletterController {

  // ================= GESTION DES TEMPLATES =================

  /**
   * Crée un nouveau template d'email
   */
  async createTemplate(req, res) {
    try {
      const template = await emailTemplateService.createTemplate(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Template créé avec succès',
        data: template
      });
    } catch (error) {
      console.error('Erreur création template:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Met à jour un template existant
   */
  async updateTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const template = await emailTemplateService.updateTemplate(templateId, req.body, req.user.id);
      
      res.json({
        success: true,
        message: 'Template mis à jour avec succès',
        data: template
      });
    } catch (error) {
      console.error('Erreur mise à jour template:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Supprime un template
   */
  async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;
      await emailTemplateService.deleteTemplate(templateId, req.user.id);
      
      res.json({
        success: true,
        message: 'Template supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression template:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupère tous les templates de l'utilisateur
   */
  async getTemplates(req, res) {
    try {
      const { category } = req.query;
      const templates = await emailTemplateService.getUserTemplates(req.user.id, category);
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Erreur récupération templates:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des templates'
      });
    }
  }

  /**
   * Récupère un template spécifique
   */
  async getTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const template = await emailTemplateService.getTemplate(templateId, req.user.id);
      
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Erreur récupération template:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Prévisualise un template avec des données d'exemple
   */
  async previewTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const sampleData = req.body || {};
      
      const preview = await emailTemplateService.previewTemplate(templateId, req.user.id, sampleData);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Erreur prévisualisation template:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Initialise les templates par défaut
   */
  async initializeDefaultTemplates(req, res) {
    try {
      const templates = await emailTemplateService.initializeDefaultTemplates(req.user.id);
      
      res.json({
        success: true,
        message: `${templates.length} templates par défaut créés`,
        data: templates
      });
    } catch (error) {
      console.error('Erreur initialisation templates:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'initialisation des templates'
      });
    }
  }

  // ================= GESTION DES CAMPAGNES =================

  /**
   * Crée une nouvelle campagne email
   */
  async createCampaign(req, res) {
    try {
      const campaign = await emailCampaignService.createCampaign(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Campagne créée avec succès',
        data: campaign
      });
    } catch (error) {
      console.error('Erreur création campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Met à jour une campagne
   */
  async updateCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const campaign = await emailCampaignService.updateCampaign(campaignId, req.body, req.user.id);
      
      res.json({
        success: true,
        message: 'Campagne mise à jour avec succès',
        data: campaign
      });
    } catch (error) {
      console.error('Erreur mise à jour campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Supprime une campagne
   */
  async deleteCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      await emailCampaignService.deleteCampaign(campaignId, req.user.id);
      
      res.json({
        success: true,
        message: 'Campagne supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupère toutes les campagnes de l'utilisateur
   */
  async getCampaigns(req, res) {
    try {
      const filters = {
        status: req.query.status,
        search: req.query.search
      };
      
      const campaigns = await emailCampaignService.getUserCampaigns(req.user.id, filters);
      
      res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      console.error('Erreur récupération campagnes:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des campagnes'
      });
    }
  }

  /**
   * Récupère une campagne spécifique
   */
  async getCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const campaign = await emailCampaignService.getCampaign(campaignId, req.user.id);
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campagne non trouvée'
        });
      }
      
      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      console.error('Erreur récupération campagne:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Envoie une campagne immédiatement
   */
  async sendCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const result = await emailCampaignService.sendCampaign(campaignId, req.user.id);
      
      res.json({
        success: true,
        message: `Campagne envoyée - ${result.sent} réussites, ${result.failed} échecs`,
        data: result
      });
    } catch (error) {
      console.error('Erreur envoi campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Programme une campagne
   */
  async scheduleCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { scheduledAt } = req.body;
      
      await emailCampaignService.scheduleCampaign(campaignId, scheduledAt, req.user.id);
      
      res.json({
        success: true,
        message: 'Campagne programmée avec succès'
      });
    } catch (error) {
      console.error('Erreur programmation campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Annule une campagne programmée
   */
  async cancelScheduledCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      
      await emailCampaignService.cancelScheduledCampaign(campaignId, req.user.id);
      
      res.json({
        success: true,
        message: 'Campagne annulée avec succès'
      });
    } catch (error) {
      console.error('Erreur annulation campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Prévisualise une campagne
   */
  async previewCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { sampleEmail } = req.body;
      
      const preview = await emailCampaignService.previewCampaign(campaignId, req.user.id, sampleEmail);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      console.error('Erreur prévisualisation campagne:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ================= ANALYTICS =================

  /**
   * Récupère les statistiques d'une campagne
   */
  async getCampaignStats(req, res) {
    try {
      const { campaignId } = req.params;
      const stats = await emailCampaignService.getCampaignStats(campaignId, req.user.id);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Récupère les statistiques globales des campagnes
   */
  async getOverallStats(req, res) {
    try {
      const campaigns = await emailCampaignService.getUserCampaigns(req.user.id, { status: 'sent' });
      
      let totalSent = 0;
      let totalOpened = 0;
      let totalClicked = 0;
      let totalBounced = 0;
      
      const campaignStats = [];
      
      for (let campaign of campaigns) {
        try {
          const stats = await emailCampaignService.getCampaignStats(campaign.id, req.user.id);
          campaignStats.push(stats);
          
          totalSent += stats.sent_count;
          totalOpened += stats.opened_count;
          totalClicked += stats.clicked_count;
          totalBounced += stats.bounced_count;
        } catch (error) {
          console.error(`Erreur stats campagne ${campaign.id}:`, error);
        }
      }
      
      const overallStats = {
        total_campaigns: campaigns.length,
        total_sent: totalSent,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        total_bounced: totalBounced,
        overall_open_rate: totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(2) : 0,
        overall_click_rate: totalSent > 0 ? (totalClicked / totalSent * 100).toFixed(2) : 0,
        overall_bounce_rate: totalSent > 0 ? (totalBounced / totalSent * 100).toFixed(2) : 0,
        campaign_details: campaignStats
      };
      
      res.json({
        success: true,
        data: overallStats
      });
    } catch (error) {
      console.error('Erreur récupération stats globales:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // ================= SEGMENTS =================

  /**
   * Récupère les segments de clients pour les campagnes
   */
  async getSegments(req, res) {
    try {
      const segments = await customerSegmentationService.getUserSegments(req.user.id);
      
      res.json({
        success: true,
        data: segments
      });
    } catch (error) {
      console.error('Erreur récupération segments:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des segments'
      });
    }
  }

  // ================= WEBHOOKS =================

  /**
   * Traite les webhooks des fournisseurs d'email
   */
  async handleEmailWebhook(req, res) {
    try {
      await emailCampaignService.handleEmailWebhook(req.body);
      
      res.json({
        success: true,
        message: 'Webhook traité avec succès'
      });
    } catch (error) {
      console.error('Erreur traitement webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

// Validations pour les templates
const createTemplateValidation = [
  body('name')
    .notEmpty()
    .withMessage('Le nom du template est requis')
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('category')
    .notEmpty()
    .withMessage('La catégorie est requise')
    .isIn(['newsletter', 'promotion', 'welcome', 'transactional'])
    .withMessage('Catégorie invalide'),
  body('html_content')
    .notEmpty()
    .withMessage('Le contenu HTML est requis'),
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

const updateTemplateValidation = [
  param('templateId').isNumeric().withMessage('ID template invalide'),
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

// Validations pour les campagnes
const createCampaignValidation = [
  body('name')
    .notEmpty()
    .withMessage('Le nom de la campagne est requis')
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('subject')
    .notEmpty()
    .withMessage('Le sujet est requis')
    .isLength({ min: 5, max: 200 })
    .withMessage('Le sujet doit contenir entre 5 et 200 caractères'),
  body('template_id')
    .isNumeric()
    .withMessage('ID template invalide'),
  body('segment_id')
    .isNumeric()
    .withMessage('ID segment invalide'),
  body('from_email')
    .isEmail()
    .withMessage('Email expéditeur invalide'),
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

const updateCampaignValidation = [
  param('campaignId').isNumeric().withMessage('ID campagne invalide'),
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

const scheduleCampaignValidation = [
  param('campaignId').isNumeric().withMessage('ID campagne invalide'),
  body('scheduledAt')
    .notEmpty()
    .withMessage('Date de programmation requise')
    .isISO8601()
    .withMessage('Format de date invalide'),
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

const controller = new NewsletterController();

module.exports = {
  NewsletterController: controller,
  createTemplateValidation,
  updateTemplateValidation,
  createCampaignValidation,
  updateCampaignValidation,
  scheduleCampaignValidation,
  // Export des méthodes directement
  createTemplate: (req, res) => controller.createTemplate(req, res),
  getTemplates: (req, res) => controller.getTemplates(req, res),
  initializeDefaultTemplates: (req, res) => controller.initializeDefaultTemplates(req, res),
  getTemplate: (req, res) => controller.getTemplate(req, res),
  updateTemplate: (req, res) => controller.updateTemplate(req, res),
  deleteTemplate: (req, res) => controller.deleteTemplate(req, res),
  previewTemplate: (req, res) => controller.previewTemplate(req, res),
  createCampaign: (req, res) => controller.createCampaign(req, res),
  getCampaigns: (req, res) => controller.getCampaigns(req, res),
  getCampaign: (req, res) => controller.getCampaign(req, res),
  updateCampaign: (req, res) => controller.updateCampaign(req, res),
  deleteCampaign: (req, res) => controller.deleteCampaign(req, res),
  sendCampaign: (req, res) => controller.sendCampaign(req, res),
  scheduleCampaign: (req, res) => controller.scheduleCampaign(req, res),
  cancelScheduledCampaign: (req, res) => controller.cancelScheduledCampaign(req, res),
  previewCampaign: (req, res) => controller.previewCampaign(req, res),
  getCampaignStats: (req, res) => controller.getCampaignStats(req, res),
  getOverallStats: (req, res) => controller.getOverallStats(req, res),
  getSegments: (req, res) => controller.getSegments(req, res),
  handleEmailWebhook: (req, res) => controller.handleEmailWebhook(req, res)
};