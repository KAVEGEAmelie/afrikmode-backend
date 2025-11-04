const reportService = require('../services/reportService');
const scheduledReportService = require('../services/scheduledReportService');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

class ReportController {
  /**
   * Génère un rapport manuel
   */
  async generateReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { type, format = 'pdf', filters = {} } = req.body;
      const userId = req.user.id;

      let reportResult;

      switch (type) {
        case 'sales':
          reportResult = await reportService.generateSalesReport(filters, format);
          break;
        case 'inventory':
          reportResult = await reportService.generateInventoryReport(filters, format);
          break;
        case 'customers':
          reportResult = await reportService.generateCustomersReport(filters, format);
          break;
        case 'orders':
          reportResult = await reportService.generateOrdersReport(filters, format);
          break;
        default:
          return res.status(400).json({
            message: 'Type de rapport non supporté'
          });
      }

      // Sauvegarder l'export
      const exportRecord = await reportService.saveReportExport({
        ...reportResult,
        reportType: type,
        filters
      }, userId);

      res.json({
        message: 'Rapport généré avec succès',
        report: {
          id: exportRecord[0].id,
          fileName: reportResult.fileName,
          fileSize: reportResult.fileSize,
          type: type,
          format: format,
          downloadUrl: `/api/reports/download/${exportRecord[0].id}`
        }
      });

    } catch (error) {
      console.error('Erreur génération rapport:', error);
      res.status(500).json({
        message: 'Erreur lors de la génération du rapport',
        error: error.message
      });
    }
  }

  /**
   * Télécharge un fichier de rapport
   */
  async downloadReport(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;

      const report = await reportService.getReportFile(reportId, userId);

      if (!report) {
        return res.status(404).json({
          message: 'Rapport non trouvé ou expiré'
        });
      }

      if (!fs.existsSync(report.file_path)) {
        return res.status(404).json({
          message: 'Fichier de rapport non disponible'
        });
      }

      // Définir les headers pour le téléchargement
      res.setHeader('Content-Disposition', `attachment; filename="${report.file_name}"`);
      res.setHeader('Content-Type', this.getContentType(report.file_type));
      res.setHeader('Content-Length', report.file_size);

      // Streamer le fichier
      const fileStream = fs.createReadStream(report.file_path);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Erreur téléchargement rapport:', error);
      res.status(500).json({
        message: 'Erreur lors du téléchargement du rapport'
      });
    }
  }

  /**
   * Récupère l'historique des rapports de l'utilisateur
   */
  async getReportHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50 } = req.query;

      const history = await reportService.getReportHistory(userId, parseInt(limit));

      res.json({
        reports: history.map(report => ({
          id: report.id,
          fileName: report.file_name,
          fileType: report.file_type,
          fileSize: report.file_size,
          reportType: report.report_type,
          status: report.status,
          createdAt: report.created_at,
          expiresAt: report.expires_at,
          downloadUrl: report.status === 'completed' ? `/api/reports/download/${report.id}` : null
        }))
      });

    } catch (error) {
      console.error('Erreur récupération historique:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération de l\'historique'
      });
    }
  }

  // ================= RAPPORTS PROGRAMMÉS =================

  /**
   * Crée un nouveau rapport programmé
   */
  async createScheduledReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const reportData = {
        ...req.body,
        userId
      };

      const scheduledReport = await scheduledReportService.createScheduledReport(reportData);

      res.status(201).json({
        message: 'Rapport programmé créé avec succès',
        report: scheduledReport
      });

    } catch (error) {
      console.error('Erreur création rapport programmé:', error);
      res.status(500).json({
        message: 'Erreur lors de la création du rapport programmé',
        error: error.message
      });
    }
  }

  /**
   * Met à jour un rapport programmé
   */
  async updateScheduledReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { reportId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const updatedReport = await scheduledReportService.updateScheduledReport(
        reportId, 
        updateData, 
        userId
      );

      res.json({
        message: 'Rapport programmé mis à jour avec succès',
        report: updatedReport
      });

    } catch (error) {
      console.error('Erreur mise à jour rapport programmé:', error);
      res.status(500).json({
        message: 'Erreur lors de la mise à jour du rapport programmé',
        error: error.message
      });
    }
  }

  /**
   * Active/désactive un rapport programmé
   */
  async toggleScheduledReport(req, res) {
    try {
      const { reportId } = req.params;
      const { is_active } = req.body;
      const userId = req.user.id;

      const report = await scheduledReportService.toggleScheduledReport(
        reportId, 
        is_active, 
        userId
      );

      res.json({
        message: `Rapport programmé ${is_active ? 'activé' : 'désactivé'} avec succès`,
        report
      });

    } catch (error) {
      console.error('Erreur toggle rapport programmé:', error);
      res.status(500).json({
        message: 'Erreur lors de la modification du rapport programmé',
        error: error.message
      });
    }
  }

  /**
   * Supprime un rapport programmé
   */
  async deleteScheduledReport(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;

      await scheduledReportService.deleteScheduledReport(reportId, userId);

      res.json({
        message: 'Rapport programmé supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur suppression rapport programmé:', error);
      res.status(500).json({
        message: 'Erreur lors de la suppression du rapport programmé',
        error: error.message
      });
    }
  }

  /**
   * Récupère les rapports programmés de l'utilisateur
   */
  async getScheduledReports(req, res) {
    try {
      const userId = req.user.id;
      const { include_inactive = false } = req.query;

      const reports = await scheduledReportService.getUserScheduledReports(
        userId, 
        include_inactive === 'true'
      );

      res.json({
        reports: reports.map(report => ({
          ...report,
          type_label: scheduledReportService.getReportTypeLabel(report.type),
          frequency_label: scheduledReportService.getFrequencyLabel(report.frequency)
        }))
      });

    } catch (error) {
      console.error('Erreur récupération rapports programmés:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des rapports programmés'
      });
    }
  }

  /**
   * Récupère un rapport programmé spécifique
   */
  async getScheduledReport(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;

      const report = await scheduledReportService.getScheduledReport(reportId, userId);

      res.json({
        report: {
          ...report,
          type_label: scheduledReportService.getReportTypeLabel(report.type),
          frequency_label: scheduledReportService.getFrequencyLabel(report.frequency)
        }
      });

    } catch (error) {
      console.error('Erreur récupération rapport programmé:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération du rapport programmé',
        error: error.message
      });
    }
  }

  /**
   * Exécute immédiatement un rapport programmé
   */
  async executeScheduledReportNow(req, res) {
    try {
      const { reportId } = req.params;
      const userId = req.user.id;

      await scheduledReportService.executeReportNow(reportId, userId);

      res.json({
        message: 'Exécution du rapport programmé en cours. Vous recevrez le rapport par email une fois généré.'
      });

    } catch (error) {
      console.error('Erreur exécution rapport programmé:', error);
      res.status(500).json({
        message: 'Erreur lors de l\'exécution du rapport programmé',
        error: error.message
      });
    }
  }

  /**
   * Statistiques des rapports (admin seulement)
   */
  async getReportsStatistics(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const scheduledStats = await scheduledReportService.getScheduledReportsStats();

      // Statistiques des exports manuels
      const totalExports = await require('../config/database')('report_exports')
        .count('* as count')
        .first();

      const exportsByType = await require('../config/database')('report_exports')
        .select('report_type')
        .count('* as count')
        .groupBy('report_type');

      const exportsByFormat = await require('../config/database')('report_exports')
        .select('file_type')
        .count('* as count')
        .groupBy('file_type');

      const recentExports = await require('../config/database')('report_exports')
        .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .count('* as count')
        .first();

      res.json({
        scheduled_reports: scheduledStats,
        manual_exports: {
          total_exports: parseInt(totalExports.count),
          exports_last_30_days: parseInt(recentExports.count),
          by_type: exportsByType.reduce((acc, item) => {
            acc[item.report_type] = parseInt(item.count);
            return acc;
          }, {}),
          by_format: exportsByFormat.reduce((acc, item) => {
            acc[item.file_type] = parseInt(item.count);
            return acc;
          }, {})
        }
      });

    } catch (error) {
      console.error('Erreur récupération statistiques rapports:', error);
      res.status(500).json({
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Nettoie les rapports expirés (tâche de maintenance)
   */
  async cleanExpiredReports(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const deletedCount = await reportService.cleanExpiredReports();

      res.json({
        message: `${deletedCount} rapport(s) expiré(s) supprimé(s)`,
        deleted_count: deletedCount
      });

    } catch (error) {
      console.error('Erreur nettoyage rapports expirés:', error);
      res.status(500).json({
        message: 'Erreur lors du nettoyage des rapports expirés'
      });
    }
  }

  // ================= HELPERS =================

  getContentType(fileType) {
    const contentTypes = {
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv'
    };
    return contentTypes[fileType] || 'application/octet-stream';
  }
}

module.exports = new ReportController();