const advancedRateLimitService = require('../services/advancedRateLimitService');
const systemLogService = require('../services/systemLogService');
const systemMonitoringService = require('../services/systemMonitoringService');
const { validationResult } = require('express-validator');

class SecurityController {
  // ================= RATE LIMITING =================

  /**
   * Récupère les statistiques de rate limiting
   */
  async getRateLimitStats(req, res) {
    return advancedRateLimitService.getRateLimitStats(req, res);
  }

  /**
   * Réinitialise les compteurs de rate limiting
   */
  async resetUserRateLimit(req, res) {
    return advancedRateLimitService.resetUserRateLimit(req, res);
  }

  // ================= SYSTEM LOGS =================

  /**
   * Récupère les logs système avec filtres
   */
  async getSystemLogs(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const {
        level,
        category,
        user_id,
        start_date,
        end_date,
        ip_address,
        endpoint,
        search,
        limit = 100,
        offset = 0
      } = req.query;

      const filters = {
        level,
        category,
        user_id,
        start_date,
        end_date,
        ip_address,
        endpoint,
        search
      };

      // Supprimer les filtres vides
      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          delete filters[key];
        }
      });

      const logs = await systemLogService.getLogs(
        filters,
        parseInt(limit),
        parseInt(offset)
      );

      // Log de l'accès aux logs
      await systemLogService.logUserAction(
        req.user.id,
        'VIEW_SYSTEM_LOGS',
        `Consultation des logs système avec filtres: ${JSON.stringify(filters)}`,
        { filters, result_count: logs.length },
        req
      );

      res.json({
        logs,
        filters_applied: filters,
        count: logs.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (error) {
      console.error('Erreur récupération logs système:', error);
      await systemLogService.error(
        systemLogService.categories.ADMIN,
        'Erreur lors de la récupération des logs système',
        { error: error.message },
        req,
        error
      );
      
      res.status(500).json({
        message: 'Erreur lors de la récupération des logs'
      });
    }
  }

  /**
   * Récupère les statistiques des logs
   */
  async getLogStatistics(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const { timeframe = '7d' } = req.query;

      const stats = await systemLogService.getLogStatistics(timeframe);

      await systemLogService.logUserAction(
        req.user.id,
        'VIEW_LOG_STATISTICS',
        `Consultation des statistiques de logs (${timeframe})`,
        { timeframe, stats_summary: { levels: Object.keys(stats.by_level || {}) } },
        req
      );

      res.json(stats);

    } catch (error) {
      console.error('Erreur statistiques logs:', error);
      await systemLogService.error(
        systemLogService.categories.ADMIN,
        'Erreur lors de la récupération des statistiques de logs',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Exporte les logs en CSV
   */
  async exportLogs(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const {
        level,
        category,
        user_id,
        start_date,
        end_date,
        ip_address,
        endpoint,
        search
      } = req.query;

      const filters = {
        level,
        category,
        user_id,
        start_date,
        end_date,
        ip_address,
        endpoint,
        search
      };

      // Supprimer les filtres vides
      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          delete filters[key];
        }
      });

      const csvContent = await systemLogService.exportLogs(filters);

      // Log de l'export
      await systemLogService.logUserAction(
        req.user.id,
        'EXPORT_SYSTEM_LOGS',
        `Export des logs système en CSV`,
        { filters },
        req
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="system_logs_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error('Erreur export logs:', error);
      await systemLogService.error(
        systemLogService.categories.ADMIN,
        'Erreur lors de l\'export des logs',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors de l\'export des logs'
      });
    }
  }

  /**
   * Nettoie les anciens logs
   */
  async cleanOldLogs(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { days_to_keep = 30 } = req.body;

      const deletedCount = await systemLogService.cleanOldLogs(parseInt(days_to_keep));

      await systemLogService.logUserAction(
        req.user.id,
        'CLEAN_OLD_LOGS',
        `Nettoyage des logs système (${days_to_keep} jours de rétention)`,
        { days_to_keep, deleted_count: deletedCount },
        req
      );

      res.json({
        message: `${deletedCount} anciens logs supprimés`,
        deleted_count: deletedCount,
        retention_days: parseInt(days_to_keep)
      });

    } catch (error) {
      console.error('Erreur nettoyage logs:', error);
      await systemLogService.error(
        systemLogService.categories.ADMIN,
        'Erreur lors du nettoyage des logs',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors du nettoyage des logs'
      });
    }
  }

  // ================= SYSTEM MONITORING =================

  /**
   * Health check complet
   */
  async getDetailedHealthCheck(req, res) {
    try {
      const healthData = await systemMonitoringService.runAllHealthChecks();

      // Log si le système n'est pas en bonne santé
      if (healthData.status !== 'healthy') {
        await systemLogService.warn(
          systemLogService.categories.SYSTEM,
          `Health check non optimal: ${healthData.status}`,
          {
            status: healthData.status,
            failed_checks: Object.entries(healthData.checks)
              .filter(([name, check]) => check.status !== 'healthy')
              .map(([name, check]) => ({ name, status: check.status, error: check.error }))
          },
          req
        );
      }

      res.json(healthData);

    } catch (error) {
      console.error('Erreur health check:', error);
      await systemLogService.error(
        systemLogService.categories.SYSTEM,
        'Erreur lors du health check',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        status: 'error',
        message: 'Erreur lors de la vérification de santé du système',
        error: error.message
      });
    }
  }

  /**
   * Récupère les métriques système
   */
  async getSystemMetrics(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const metrics = systemMonitoringService.getSystemMetrics();

      res.json(metrics);

    } catch (error) {
      console.error('Erreur métriques système:', error);
      await systemLogService.error(
        systemLogService.categories.SYSTEM,
        'Erreur lors de la récupération des métriques',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors de la récupération des métriques'
      });
    }
  }

  /**
   * Vérifie les alertes critiques
   */
  async checkCriticalAlerts(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const alerts = await systemMonitoringService.checkCriticalAlerts();

      res.json({
        alert_count: alerts.length,
        alerts,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erreur vérification alertes:', error);
      await systemLogService.error(
        systemLogService.categories.SYSTEM,
        'Erreur lors de la vérification des alertes',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors de la vérification des alertes'
      });
    }
  }

  // ================= SÉCURITÉ GÉNÉRALE =================

  /**
   * Tableau de bord sécurité global
   */
  async getSecurityDashboard(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      // Récupérer diverses métriques de sécurité
      const [
        logStats,
        healthCheck,
        systemMetrics,
        criticalAlerts
      ] = await Promise.all([
        systemLogService.getLogStatistics('24h'),
        systemMonitoringService.basicHealthCheck(),
        systemMonitoringService.getSystemMetrics(),
        systemMonitoringService.checkCriticalAlerts()
      ]);

      const dashboard = {
        system_status: healthCheck.status,
        critical_alerts: criticalAlerts.length,
        error_rate_24h: logStats.by_level?.error || 0,
        total_requests_24h: Object.values(logStats.by_category || {}).reduce((a, b) => a + b, 0),
        memory_usage: Math.round((systemMetrics.current_memory.heapUsed / systemMetrics.current_memory.heapTotal) * 100),
        uptime_hours: Math.round(systemMetrics.uptime / 3600),
        recent_security_events: logStats.recent_errors.filter(log => log.category === 'security').slice(0, 5),
        top_error_endpoints: logStats.top_endpoints.slice(0, 5),
        suspicious_ips: logStats.top_ips.slice(0, 5),
        timestamp: new Date().toISOString()
      };

      await systemLogService.logUserAction(
        req.user.id,
        'VIEW_SECURITY_DASHBOARD',
        'Consultation du tableau de bord sécurité',
        { dashboard_metrics: Object.keys(dashboard) },
        req
      );

      res.json(dashboard);

    } catch (error) {
      console.error('Erreur tableau de bord sécurité:', error);
      await systemLogService.error(
        systemLogService.categories.SECURITY,
        'Erreur lors de la génération du tableau de bord sécurité',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors de la récupération du tableau de bord sécurité'
      });
    }
  }

  /**
   * Rapport de sécurité détaillé
   */
  async generateSecurityReport(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          message: 'Accès non autorisé'
        });
      }

      const { timeframe = '7d' } = req.query;

      const report = {
        report_type: 'security_analysis',
        timeframe,
        generated_at: new Date().toISOString(),
        generated_by: req.user.id,
        
        // Statistiques de logs
        log_analysis: await systemLogService.getLogStatistics(timeframe),
        
        // État système
        system_health: await systemMonitoringService.runAllHealthChecks(),
        
        // Métriques actuelles
        current_metrics: systemMonitoringService.getSystemMetrics(),
        
        // Alertes critiques
        active_alerts: await systemMonitoringService.checkCriticalAlerts(),
        
        // Recommandations (exemple)
        recommendations: this.generateSecurityRecommendations()
      };

      await systemLogService.logUserAction(
        req.user.id,
        'GENERATE_SECURITY_REPORT',
        `Génération d'un rapport de sécurité (${timeframe})`,
        { timeframe, report_size: JSON.stringify(report).length },
        req
      );

      res.json(report);

    } catch (error) {
      console.error('Erreur rapport sécurité:', error);
      await systemLogService.error(
        systemLogService.categories.SECURITY,
        'Erreur lors de la génération du rapport de sécurité',
        { error: error.message },
        req,
        error
      );

      res.status(500).json({
        message: 'Erreur lors de la génération du rapport de sécurité'
      });
    }
  }

  // ================= HELPERS =================

  generateSecurityRecommendations() {
    return [
      {
        priority: 'high',
        category: 'monitoring',
        title: 'Surveillance continue',
        description: 'Maintenir une surveillance active des métriques système',
        actions: ['Configurer des alertes automatiques', 'Réviser les seuils d\'alerte']
      },
      {
        priority: 'medium',
        category: 'logs',
        title: 'Rétention des logs',
        description: 'Optimiser la rétention des logs selon les besoins',
        actions: ['Archiver les anciens logs', 'Configurer la rotation automatique']
      },
      {
        priority: 'medium',
        category: 'rate_limiting',
        title: 'Rate limiting',
        description: 'Réviser les limites de taux selon l\'utilisation',
        actions: ['Analyser les patterns d\'usage', 'Ajuster les limites par rôle']
      }
    ];
  }
}

module.exports = new SecurityController();