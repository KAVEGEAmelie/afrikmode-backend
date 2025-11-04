const db = require('../config/database');
const emailService = require('./emailService');
const emailTemplateService = require('./emailTemplateService');
const customerSegmentationService = require('./customerSegmentationService');

/**
 * Service de gestion des campagnes email
 */
class EmailCampaignService {
  constructor() {
    this.campaignStatuses = {
      DRAFT: 'draft',
      SCHEDULED: 'scheduled',
      SENDING: 'sending',
      SENT: 'sent',
      CANCELLED: 'cancelled',
      FAILED: 'failed'
    };
  }

  /**
   * Crée une nouvelle campagne email
   */
  async createCampaign(campaignData, userId) {
    const {
      name,
      description,
      template_id,
      segment_id,
      subject,
      from_name = 'AfrikMode',
      from_email,
      reply_to,
      scheduled_at = null,
      variables = {}
    } = campaignData;

    // Vérifier que le template existe
    const template = await emailTemplateService.getTemplate(template_id, userId);
    if (!template) {
      throw new Error('Template non trouvé');
    }

    // Vérifier que le segment existe
    const segment = await customerSegmentationService.getSegment(segment_id, userId);
    if (!segment) {
      throw new Error('Segment non trouvé');
    }

    // Calculer le nombre de destinataires
    const recipientCount = await customerSegmentationService.calculateSegmentSize(segment_id, userId);

    const status = scheduled_at ? this.campaignStatuses.SCHEDULED : this.campaignStatuses.DRAFT;

    const [campaign] = await db('email_campaigns').insert({
      name,
      description,
      template_id,
      segment_id,
      subject,
      from_name,
      from_email,
      reply_to,
      scheduled_at,
      variables: JSON.stringify(variables),
      status,
      recipient_count: recipientCount,
      created_by: userId
    }).returning('*');

    return {
      ...campaign,
      variables: JSON.parse(campaign.variables || '{}')
    };
  }

  /**
   * Met à jour une campagne
   */
  async updateCampaign(campaignId, updateData, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    if (campaign.status === this.campaignStatuses.SENT || 
        campaign.status === this.campaignStatuses.SENDING) {
      throw new Error('Impossible de modifier une campagne envoyée ou en cours d\'envoi');
    }

    // Mettre à jour le nombre de destinataires si le segment change
    if (updateData.segment_id && updateData.segment_id !== campaign.segment_id) {
      updateData.recipient_count = await customerSegmentationService.calculateSegmentSize(updateData.segment_id, userId);
    }

    if (updateData.variables) {
      updateData.variables = JSON.stringify(updateData.variables);
    }

    // Mettre à jour le statut si nécessaire
    if (updateData.scheduled_at && campaign.status === this.campaignStatuses.DRAFT) {
      updateData.status = this.campaignStatuses.SCHEDULED;
    }

    const [updatedCampaign] = await db('email_campaigns')
      .where('id', campaignId)
      .where('created_by', userId)
      .update(updateData)
      .returning('*');

    return {
      ...updatedCampaign,
      variables: JSON.parse(updatedCampaign.variables || '{}')
    };
  }

  /**
   * Récupère une campagne
   */
  async getCampaign(campaignId, userId) {
    const campaign = await db('email_campaigns')
      .leftJoin('email_templates', 'email_campaigns.template_id', 'email_templates.id')
      .leftJoin('customer_segments', 'email_campaigns.segment_id', 'customer_segments.id')
      .where('email_campaigns.id', campaignId)
      .where('email_campaigns.created_by', userId)
      .select(
        'email_campaigns.*',
        'email_templates.name as template_name',
        'customer_segments.name as segment_name'
      )
      .first();

    if (!campaign) {
      return null;
    }

    return {
      ...campaign,
      variables: JSON.parse(campaign.variables || '{}')
    };
  }

  /**
   * Liste les campagnes d'un utilisateur
   */
  async getUserCampaigns(userId, filters = {}) {
    let query = db('email_campaigns')
      .leftJoin('email_templates', 'email_campaigns.template_id', 'email_templates.id')
      .leftJoin('customer_segments', 'email_campaigns.segment_id', 'customer_segments.id')
      .where('email_campaigns.created_by', userId);

    if (filters.status) {
      query = query.where('email_campaigns.status', filters.status);
    }

    if (filters.search) {
      query = query.where(function() {
        this.where('email_campaigns.name', 'ilike', `%${filters.search}%`)
            .orWhere('email_campaigns.subject', 'ilike', `%${filters.search}%`);
      });
    }

    const campaigns = await query
      .select(
        'email_campaigns.*',
        'email_templates.name as template_name',
        'customer_segments.name as segment_name'
      )
      .orderBy('email_campaigns.created_at', 'desc');

    return campaigns.map(campaign => ({
      ...campaign,
      variables: JSON.parse(campaign.variables || '{}')
    }));
  }

  /**
   * Supprime une campagne
   */
  async deleteCampaign(campaignId, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    if (campaign.status === this.campaignStatuses.SENDING) {
      throw new Error('Impossible de supprimer une campagne en cours d\'envoi');
    }

    // Supprimer les analytics associées
    await db('email_analytics')
      .where('campaign_id', campaignId)
      .del();

    const deleted = await db('email_campaigns')
      .where('id', campaignId)
      .where('created_by', userId)
      .del();

    return deleted > 0;
  }

  /**
   * Envoie une campagne immédiatement
   */
  async sendCampaign(campaignId, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    if (campaign.status !== this.campaignStatuses.DRAFT && 
        campaign.status !== this.campaignStatuses.SCHEDULED) {
      throw new Error('La campagne ne peut pas être envoyée dans son état actuel');
    }

    // Marquer comme en cours d'envoi
    await db('email_campaigns')
      .where('id', campaignId)
      .update({ 
        status: this.campaignStatuses.SENDING,
        sent_at: new Date()
      });

    try {
      // Récupérer les destinataires du segment
      const recipients = await customerSegmentationService.getCustomersForCriteria(
        campaign.segment_id, 
        userId
      );

      if (!recipients || recipients.length === 0) {
        throw new Error('Aucun destinataire trouvé pour ce segment');
      }

      // Récupérer le template
      const template = await emailTemplateService.getTemplate(campaign.template_id, userId);

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // Envoyer l'email à chaque destinataire
      for (let recipient of recipients) {
        try {
          // Personnaliser les variables pour ce destinataire
          const personalizedVariables = {
            ...JSON.parse(campaign.variables || '{}'),
            customer_name: recipient.first_name || recipient.email,
            customer_email: recipient.email
          };

          // Compiler le template
          const compiledHtml = emailTemplateService.compileTemplate(
            template.html_content, 
            personalizedVariables
          );

          // Envoyer l'email
          await emailService.sendEmail({
            to: recipient.email,
            subject: campaign.subject,
            html: compiledHtml,
            from_name: campaign.from_name,
            from_email: campaign.from_email,
            reply_to: campaign.reply_to
          });

          // Enregistrer l'analytics
          await this.recordEmailAnalytics({
            campaign_id: campaignId,
            user_id: recipient.id,
            email: recipient.email,
            event_type: 'sent',
            timestamp: new Date()
          });

          successCount++;

        } catch (error) {
          console.error(`Erreur envoi email à ${recipient.email}:`, error);
          failureCount++;
          errors.push({
            email: recipient.email,
            error: error.message
          });

          // Enregistrer l'échec
          await this.recordEmailAnalytics({
            campaign_id: campaignId,
            user_id: recipient.id,
            email: recipient.email,
            event_type: 'failed',
            timestamp: new Date(),
            metadata: JSON.stringify({ error: error.message })
          });
        }
      }

      // Mettre à jour le statut final
      const finalStatus = failureCount > 0 && successCount === 0 
        ? this.campaignStatuses.FAILED 
        : this.campaignStatuses.SENT;

      await db('email_campaigns')
        .where('id', campaignId)
        .update({
          status: finalStatus,
          emails_sent: successCount,
          emails_failed: failureCount
        });

      return {
        success: true,
        sent: successCount,
        failed: failureCount,
        errors: errors.slice(0, 10) // Limiter les erreurs retournées
      };

    } catch (error) {
      // Marquer la campagne comme échouée
      await db('email_campaigns')
        .where('id', campaignId)
        .update({ 
          status: this.campaignStatuses.FAILED,
          emails_failed: campaign.recipient_count
        });

      throw error;
    }
  }

  /**
   * Programme une campagne
   */
  async scheduleCampaign(campaignId, scheduledAt, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    if (campaign.status !== this.campaignStatuses.DRAFT) {
      throw new Error('Seules les campagnes en brouillon peuvent être programmées');
    }

    if (new Date(scheduledAt) <= new Date()) {
      throw new Error('La date de programmation doit être dans le futur');
    }

    await db('email_campaigns')
      .where('id', campaignId)
      .update({
        scheduled_at: scheduledAt,
        status: this.campaignStatuses.SCHEDULED
      });

    return true;
  }

  /**
   * Annule une campagne programmée
   */
  async cancelScheduledCampaign(campaignId, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    if (campaign.status !== this.campaignStatuses.SCHEDULED) {
      throw new Error('Seules les campagnes programmées peuvent être annulées');
    }

    await db('email_campaigns')
      .where('id', campaignId)
      .update({
        status: this.campaignStatuses.CANCELLED,
        scheduled_at: null
      });

    return true;
  }

  /**
   * Enregistre les analytics d'email
   */
  async recordEmailAnalytics(analyticsData) {
    const {
      campaign_id,
      user_id,
      email,
      event_type, // 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed'
      timestamp = new Date(),
      metadata = null
    } = analyticsData;

    return await db('email_analytics').insert({
      campaign_id,
      user_id,
      email,
      event_type,
      timestamp,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  }

  /**
   * Récupère les statistiques d'une campagne
   */
  async getCampaignStats(campaignId, userId) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    const stats = await db('email_analytics')
      .where('campaign_id', campaignId)
      .select('event_type')
      .select(db.raw('COUNT(*) as count'))
      .groupBy('event_type');

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.event_type] = parseInt(stat.count);
      return acc;
    }, {});

    const sent = statsMap.sent || 0;
    const opened = statsMap.opened || 0;
    const clicked = statsMap.clicked || 0;
    const bounced = statsMap.bounced || 0;
    const unsubscribed = statsMap.unsubscribed || 0;

    return {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      recipient_count: campaign.recipient_count,
      sent_count: sent,
      delivered_count: sent - bounced,
      opened_count: opened,
      clicked_count: clicked,
      bounced_count: bounced,
      unsubscribed_count: unsubscribed,
      open_rate: sent > 0 ? (opened / sent * 100).toFixed(2) : 0,
      click_rate: sent > 0 ? (clicked / sent * 100).toFixed(2) : 0,
      bounce_rate: sent > 0 ? (bounced / sent * 100).toFixed(2) : 0,
      unsubscribe_rate: sent > 0 ? (unsubscribed / sent * 100).toFixed(2) : 0,
      sent_at: campaign.sent_at,
      created_at: campaign.created_at
    };
  }

  /**
   * Traite les événements webhook des fournisseurs d'email
   */
  async handleEmailWebhook(webhookData) {
    const { 
      campaign_id, 
      email, 
      event_type, 
      timestamp, 
      metadata 
    } = webhookData;

    if (!campaign_id || !email || !event_type) {
      throw new Error('Données webhook incomplètes');
    }

    // Trouver l'utilisateur par email
    const user = await db('users').where('email', email).first();
    const user_id = user ? user.id : null;

    await this.recordEmailAnalytics({
      campaign_id,
      user_id,
      email,
      event_type,
      timestamp: new Date(timestamp),
      metadata
    });

    // Traitement spécial pour les désinscriptions
    if (event_type === 'unsubscribed') {
      await db('newsletter_subscriptions')
        .where('email', email)
        .update({ 
          is_active: false,
          unsubscribed_at: new Date()
        });
    }

    return true;
  }

  /**
   * Récupère les campagnes programmées à envoyer
   */
  async getScheduledCampaigns() {
    return await db('email_campaigns')
      .where('status', this.campaignStatuses.SCHEDULED)
      .where('scheduled_at', '<=', new Date())
      .select('*');
  }

  /**
   * Prévisualise une campagne
   */
  async previewCampaign(campaignId, userId, sampleEmail = null) {
    const campaign = await this.getCampaign(campaignId, userId);
    
    if (!campaign) {
      throw new Error('Campagne non trouvée');
    }

    // Récupérer un client exemple du segment
    const sampleCustomers = await customerSegmentationService.getCustomersForCriteria(
      campaign.segment_id, 
      userId,
      1 // Limite à 1 client
    );

    const sampleCustomer = sampleCustomers[0] || { 
      email: sampleEmail || 'exemple@email.com',
      first_name: 'Client'
    };

    // Personnaliser les variables
    const personalizedVariables = {
      ...JSON.parse(campaign.variables || '{}'),
      customer_name: sampleCustomer.first_name || 'Client',
      customer_email: sampleCustomer.email
    };

    // Récupérer et compiler le template
    const template = await emailTemplateService.getTemplate(campaign.template_id, userId);
    const compiledHtml = emailTemplateService.compileTemplate(
      template.html_content, 
      personalizedVariables
    );

    return {
      campaign,
      template,
      sample_customer: sampleCustomer,
      compiled_html: compiledHtml,
      variables_used: personalizedVariables
    };
  }
}

module.exports = new EmailCampaignService();