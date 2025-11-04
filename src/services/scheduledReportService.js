const cron = require('node-cron');
const { db } = require('../config/database');
const reportService = require('./reportService');
const emailService = require('./emailService');

class ScheduledReportService {
  constructor() {
    this.scheduledJobs = new Map();
    this.initializeScheduledReports();
  }

  /**
   * Initialise les rapports programmés au démarrage du serveur
   */
  async initializeScheduledReports() {
    try {
      const activeReports = await db('scheduled_reports')
        .where('is_active', true)
        .select('*');

      for (let report of activeReports) {
        await this.scheduleReport(report);
      }

      console.log(`${activeReports.length} rapport(s) programmé(s) initialisé(s)`);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des rapports programmés:', error);
    }
  }

  /**
   * Crée un nouveau rapport programmé
   */
  async createScheduledReport(reportData) {
    const {
      name,
      type,
      format = 'pdf',
      frequency,
      filters = {},
      recipients,
      userId
    } = reportData;

    // Validation
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      throw new Error('Fréquence non supportée');
    }

    if (!['sales', 'inventory', 'customers', 'orders'].includes(type)) {
      throw new Error('Type de rapport non supporté');
    }

    if (!['pdf', 'excel', 'csv'].includes(format)) {
      throw new Error('Format non supporté');
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Au moins un destinataire requis');
    }

    // Calculer la prochaine exécution
    const nextExecution = this.calculateNextExecution(frequency);

    // Créer l'enregistrement
    const [scheduledReport] = await db('scheduled_reports').insert({
      name,
      type,
      format,
      frequency,
      filters: JSON.stringify(filters),
      recipients: JSON.stringify(recipients),
      created_by: userId,
      is_active: true,
      next_generation_at: nextExecution,
      generation_log: JSON.stringify([])
    }).returning('*');

    // Programmer la tâche cron
    await this.scheduleReport(scheduledReport);

    return scheduledReport;
  }

  /**
   * Met à jour un rapport programmé
   */
  async updateScheduledReport(reportId, updateData, userId) {
    const report = await db('scheduled_reports')
      .where('id', reportId)
      .where('created_by', userId)
      .first();

    if (!report) {
      throw new Error('Rapport programmé non trouvé');
    }

    // Supprimer l'ancienne tâche
    this.unscheduleReport(reportId);

    // Recalculer la prochaine exécution si la fréquence change
    if (updateData.frequency && updateData.frequency !== report.frequency) {
      updateData.next_generation_at = this.calculateNextExecution(updateData.frequency);
    }

    // Sérialiser les objets JSON
    if (updateData.filters) {
      updateData.filters = JSON.stringify(updateData.filters);
    }
    if (updateData.recipients) {
      updateData.recipients = JSON.stringify(updateData.recipients);
    }

    // Mettre à jour
    const [updatedReport] = await db('scheduled_reports')
      .where('id', reportId)
      .update(updateData)
      .returning('*');

    // Reprogrammer si actif
    if (updatedReport.is_active) {
      await this.scheduleReport(updatedReport);
    }

    return updatedReport;
  }

  /**
   * Active/désactive un rapport programmé
   */
  async toggleScheduledReport(reportId, isActive, userId) {
    const report = await db('scheduled_reports')
      .where('id', reportId)
      .where('created_by', userId)
      .first();

    if (!report) {
      throw new Error('Rapport programmé non trouvé');
    }

    if (isActive) {
      // Activer - recalculer prochaine exécution
      const nextExecution = this.calculateNextExecution(report.frequency);
      await db('scheduled_reports')
        .where('id', reportId)
        .update({
          is_active: true,
          next_generation_at: nextExecution
        });

      // Programmer la tâche
      const updatedReport = await db('scheduled_reports')
        .where('id', reportId)
        .first();
      await this.scheduleReport(updatedReport);
    } else {
      // Désactiver
      await db('scheduled_reports')
        .where('id', reportId)
        .update({
          is_active: false,
          next_generation_at: null
        });

      // Supprimer la tâche programmée
      this.unscheduleReport(reportId);
    }

    return await db('scheduled_reports').where('id', reportId).first();
  }

  /**
   * Supprime un rapport programmé
   */
  async deleteScheduledReport(reportId, userId) {
    const report = await db('scheduled_reports')
      .where('id', reportId)
      .where('created_by', userId)
      .first();

    if (!report) {
      throw new Error('Rapport programmé non trouvé');
    }

    // Supprimer la tâche programmée
    this.unscheduleReport(reportId);

    // Supprimer de la base
    await db('scheduled_reports').where('id', reportId).del();

    return true;
  }

  /**
   * Programme une tâche cron pour un rapport
   */
  async scheduleReport(report) {
    const cronExpression = this.getCronExpression(report.frequency);
    
    if (!cronExpression) {
      console.error(`Expression cron invalide pour le rapport ${report.id}`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      await this.executeScheduledReport(report.id);
    }, {
      scheduled: false,
      timezone: 'Europe/Paris'
    });

    this.scheduledJobs.set(report.id, job);
    job.start();

    console.log(`Rapport programmé ${report.name} (${report.id}) - Prochaine exécution: ${report.next_generation_at}`);
  }

  /**
   * Supprime la programmation d'un rapport
   */
  unscheduleReport(reportId) {
    const job = this.scheduledJobs.get(reportId);
    if (job) {
      job.destroy();
      this.scheduledJobs.delete(reportId);
      console.log(`Rapport déprogrammé: ${reportId}`);
    }
  }

  /**
   * Exécute un rapport programmé
   */
  async executeScheduledReport(reportId) {
    try {
      console.log(`Exécution du rapport programmé: ${reportId}`);

      const report = await db('scheduled_reports')
        .where('id', reportId)
        .where('is_active', true)
        .first();

      if (!report) {
        console.log(`Rapport ${reportId} non trouvé ou inactif`);
        return;
      }

      const filters = JSON.parse(report.filters || '{}');
      const recipients = JSON.parse(report.recipients || '[]');

      // Générer le rapport selon le type
      let reportResult;
      switch (report.type) {
        case 'sales':
          reportResult = await reportService.generateSalesReport(filters, report.format);
          break;
        case 'inventory':
          reportResult = await reportService.generateInventoryReport(filters, report.format);
          break;
        case 'customers':
          reportResult = await reportService.generateCustomersReport(filters, report.format);
          break;
        case 'orders':
          reportResult = await reportService.generateOrdersReport(filters, report.format);
          break;
        default:
          throw new Error(`Type de rapport non supporté: ${report.type}`);
      }

      // Sauvegarder l'export
      const exportRecord = await reportService.saveReportExport({
        ...reportResult,
        reportType: report.type,
        filters
      }, report.created_by, reportId);

      // Envoyer par email aux destinataires
      await this.sendReportByEmail(report, reportResult, recipients);

      // Mettre à jour les logs et prochaine exécution
      await this.updateReportExecution(reportId, 'success', exportRecord[0].id);

      console.log(`Rapport programmé ${reportId} exécuté avec succès`);

    } catch (error) {
      console.error(`Erreur lors de l'exécution du rapport ${reportId}:`, error);
      await this.updateReportExecution(reportId, 'error', null, error.message);
    }
  }

  /**
   * Envoie un rapport par email
   */
  async sendReportByEmail(report, reportResult, recipients) {
    const subject = `AfrikMode - Rapport ${report.name}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📊 AfrikMode</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Plateforme E-commerce</p>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Rapport programmé: ${report.name}</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>Type de rapport:</strong> ${this.getReportTypeLabel(report.type)}</p>
            <p><strong>Format:</strong> ${report.format.toUpperCase()}</p>
            <p><strong>Fréquence:</strong> ${this.getFrequencyLabel(report.frequency)}</p>
            <p><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1976d2;">
              📎 Le rapport est joint à cet email au format ${report.format.toUpperCase()}.
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #666; font-size: 14px;">
              Vous recevez cet email car vous êtes abonné aux rapports automatiques d'AfrikMode.
            </p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2025 AfrikMode - Plateforme E-commerce</p>
        </div>
      </div>
    `;

    // Envoyer à tous les destinataires
    for (let recipient of recipients) {
      try {
        await emailService.sendEmail({
          to: recipient,
          subject: subject,
          html: htmlContent,
          attachments: [{
            filename: reportResult.fileName,
            path: reportResult.filePath
          }]
        });
        
        console.log(`Rapport envoyé à: ${recipient}`);
      } catch (error) {
        console.error(`Erreur envoi email à ${recipient}:`, error);
      }
    }
  }

  /**
   * Met à jour l'exécution du rapport
   */
  async updateReportExecution(reportId, status, exportId = null, errorMessage = null) {
    const report = await db('scheduled_reports').where('id', reportId).first();
    if (!report) return;

    // Récupérer les logs existants
    let logs = JSON.parse(report.generation_log || '[]');
    
    // Ajouter le nouveau log
    logs.push({
      timestamp: new Date().toISOString(),
      status,
      export_id: exportId,
      error: errorMessage
    });

    // Garder seulement les 50 derniers logs
    if (logs.length > 50) {
      logs = logs.slice(-50);
    }

    // Calculer la prochaine exécution
    const nextExecution = this.calculateNextExecution(report.frequency);

    await db('scheduled_reports')
      .where('id', reportId)
      .update({
        last_generated_at: new Date(),
        next_generation_at: nextExecution,
        generation_log: JSON.stringify(logs)
      });
  }

  /**
   * Calcule la prochaine date d'exécution selon la fréquence
   */
  calculateNextExecution(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        return nextWeek;
      
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        return nextMonth;
      
      case 'yearly':
        const nextYear = new Date(now);
        nextYear.setFullYear(now.getFullYear() + 1);
        return nextYear;
      
      default:
        return null;
    }
  }

  /**
   * Génère l'expression cron selon la fréquence
   */
  getCronExpression(frequency) {
    switch (frequency) {
      case 'daily':
        return '0 9 * * *'; // Tous les jours à 9h
      case 'weekly':
        return '0 9 * * 1'; // Tous les lundis à 9h
      case 'monthly':
        return '0 9 1 * *'; // Le 1er de chaque mois à 9h
      case 'yearly':
        return '0 9 1 1 *'; // Le 1er janvier à 9h
      default:
        return null;
    }
  }

  /**
   * Récupère les rapports programmés d'un utilisateur
   */
  async getUserScheduledReports(userId, includeInactive = false) {
    let query = db('scheduled_reports')
      .where('created_by', userId);

    if (!includeInactive) {
      query = query.where('is_active', true);
    }

    const reports = await query
      .orderBy('created_at', 'desc')
      .select('*');

    // Parser les JSON fields
    return reports.map(report => ({
      ...report,
      filters: JSON.parse(report.filters || '{}'),
      recipients: JSON.parse(report.recipients || '[]'),
      generation_log: JSON.parse(report.generation_log || '[]')
    }));
  }

  /**
   * Récupère un rapport programmé spécifique
   */
  async getScheduledReport(reportId, userId) {
    const report = await db('scheduled_reports')
      .where('id', reportId)
      .where('created_by', userId)
      .first();

    if (!report) {
      throw new Error('Rapport programmé non trouvé');
    }

    return {
      ...report,
      filters: JSON.parse(report.filters || '{}'),
      recipients: JSON.parse(report.recipients || '[]'),
      generation_log: JSON.parse(report.generation_log || '[]')
    };
  }

  /**
   * Exécute immédiatement un rapport programmé
   */
  async executeReportNow(reportId, userId) {
    const report = await db('scheduled_reports')
      .where('id', reportId)
      .where('created_by', userId)
      .first();

    if (!report) {
      throw new Error('Rapport programmé non trouvé');
    }

    await this.executeScheduledReport(reportId);
    return true;
  }

  /**
   * Statistiques globales des rapports programmés
   */
  async getScheduledReportsStats() {
    const totalReports = await db('scheduled_reports').count('* as count').first();
    const activeReports = await db('scheduled_reports').where('is_active', true).count('* as count').first();
    
    const byFrequency = await db('scheduled_reports')
      .select('frequency')
      .count('* as count')
      .groupBy('frequency');

    const byType = await db('scheduled_reports')
      .select('type')
      .count('* as count')
      .groupBy('type');

    const recentExecutions = await db('report_exports')
      .whereNotNull('scheduled_report_id')
      .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .count('* as count')
      .first();

    return {
      total_reports: parseInt(totalReports.count),
      active_reports: parseInt(activeReports.count),
      by_frequency: byFrequency.reduce((acc, item) => {
        acc[item.frequency] = parseInt(item.count);
        return acc;
      }, {}),
      by_type: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      executions_last_30_days: parseInt(recentExecutions.count)
    };
  }

  // =================== HELPERS ===================

  getReportTypeLabel(type) {
    const labels = {
      'sales': 'Ventes',
      'inventory': 'Inventaire',
      'customers': 'Clients',
      'orders': 'Commandes'
    };
    return labels[type] || type;
  }

  getFrequencyLabel(frequency) {
    const labels = {
      'daily': 'Quotidien',
      'weekly': 'Hebdomadaire',
      'monthly': 'Mensuel',
      'yearly': 'Annuel'
    };
    return labels[frequency] || frequency;
  }
}

module.exports = new ScheduledReportService();