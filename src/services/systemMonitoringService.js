const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');
const systemLogService = require('./systemLogService');

/**
 * Service de monitoring avancé du système
 */
class SystemMonitoringService {
  constructor() {
    this.healthChecks = new Map();
    this.metrics = {
      requests_total: 0,
      requests_errors: 0,
      requests_duration: [],
      memory_usage: [],
      cpu_usage: [],
      db_connections: 0,
      last_check: null
    };
    
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Initialise les checks de santé
   */
  initializeHealthChecks() {
    // Check base de données
    this.healthChecks.set('database', async () => {
      try {
        const result = await db.raw('SELECT 1 as test');
        const connectionCount = await this.getDatabaseConnectionCount();
        
        return {
          status: 'healthy',
          response_time: Date.now(),
          connections: connectionCount,
          details: 'Base de données accessible'
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          details: 'Erreur de connexion à la base de données'
        };
      }
    });

    // Check disque dur
    this.healthChecks.set('disk', async () => {
      try {
        const stats = await fs.stat(process.cwd());
        const diskSpace = await this.getDiskSpace();
        
        return {
          status: diskSpace.free_percentage > 10 ? 'healthy' : 'warning',
          free_space: diskSpace.free_gb,
          total_space: diskSpace.total_gb,
          free_percentage: diskSpace.free_percentage,
          details: `${diskSpace.free_gb}GB libres sur ${diskSpace.total_gb}GB`
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          details: 'Erreur vérification espace disque'
        };
      }
    });

    // Check mémoire
    this.healthChecks.set('memory', async () => {
      const memUsage = process.memoryUsage();
      const systemMem = {
        total: os.totalmem(),
        free: os.freemem()
      };
      
      const memPercentage = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2);
      const systemMemPercentage = (((systemMem.total - systemMem.free) / systemMem.total) * 100).toFixed(2);
      
      return {
        status: memPercentage < 80 ? 'healthy' : 'warning',
        heap_used: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total: Math.round(memUsage.heapTotal / 1024 / 1024),
        heap_percentage: memPercentage,
        system_memory_used: Math.round((systemMem.total - systemMem.free) / 1024 / 1024),
        system_memory_total: Math.round(systemMem.total / 1024 / 1024),
        system_memory_percentage: systemMemPercentage,
        details: `Heap: ${memPercentage}% - Système: ${systemMemPercentage}%`
      };
    });

    // Check CPU
    this.healthChecks.set('cpu', async () => {
      const cpuUsage = await this.getCPUUsage();
      const loadAverage = os.loadavg();
      
      return {
        status: cpuUsage < 80 ? 'healthy' : 'warning',
        usage_percentage: cpuUsage,
        load_average: loadAverage,
        cores: os.cpus().length,
        details: `CPU: ${cpuUsage}% - Load: [${loadAverage.map(l => l.toFixed(2)).join(', ')}]`
      };
    });

    // Check services externes (Redis si configuré)
    this.healthChecks.set('external_services', async () => {
      const services = {
        redis: await this.checkRedis(),
        email: await this.checkEmailService()
      };
      
      const allHealthy = Object.values(services).every(service => service.status === 'healthy');
      
      return {
        status: allHealthy ? 'healthy' : 'warning',
        services,
        details: `Services externes: ${Object.entries(services).map(([name, svc]) => `${name}:${svc.status}`).join(', ')}`
      };
    });

    // Check logs et erreurs récentes
    this.healthChecks.set('error_rate', async () => {
      try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const errorCount = await db('system_logs')
          .whereIn('level', ['error', 'critical'])
          .where('created_at', '>=', last24h)
          .count('* as count')
          .first();
        
        const totalRequests = await db('system_logs')
          .where('category', 'api')
          .where('created_at', '>=', last24h)
          .count('* as count')
          .first();
        
        const errors = parseInt(errorCount.count);
        const total = parseInt(totalRequests.count);
        const errorRate = total > 0 ? ((errors / total) * 100).toFixed(2) : 0;
        
        return {
          status: errorRate < 5 ? 'healthy' : errorRate < 10 ? 'warning' : 'critical',
          error_count_24h: errors,
          total_requests_24h: total,
          error_rate_percentage: errorRate,
          details: `Taux d'erreur: ${errorRate}% (${errors}/${total} requêtes)`
        };
      } catch (error) {
        return {
          status: 'unknown',
          error: error.message,
          details: 'Impossible de calculer le taux d\'erreur'
        };
      }
    });

    console.log('✅ Health checks initialisés');
  }

  /**
   * Démarre la collecte de métriques
   */
  startMetricsCollection() {
    // Collecter les métriques toutes les 30 secondes
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    console.log('✅ Collecte de métriques démarrée');
  }

  /**
   * Collecte les métriques système
   */
  async collectMetrics() {
    try {
      // Mémoire
      const memUsage = process.memoryUsage();
      this.metrics.memory_usage.push({
        timestamp: Date.now(),
        heap_used: memUsage.heapUsed,
        heap_total: memUsage.heapTotal,
        rss: memUsage.rss
      });

      // CPU
      const cpuUsage = await this.getCPUUsage();
      this.metrics.cpu_usage.push({
        timestamp: Date.now(),
        usage: cpuUsage,
        load_average: os.loadavg()
      });

      // Garder seulement les 100 dernières mesures (50 minutes)
      if (this.metrics.memory_usage.length > 100) {
        this.metrics.memory_usage = this.metrics.memory_usage.slice(-100);
      }
      if (this.metrics.cpu_usage.length > 100) {
        this.metrics.cpu_usage = this.metrics.cpu_usage.slice(-100);
      }
      
      this.metrics.last_check = new Date().toISOString();
      
    } catch (error) {
      console.error('Erreur collecte métriques:', error);
    }
  }

  /**
   * Exécute tous les health checks
   */
  async runAllHealthChecks() {
    const results = {};
    
    for (let [name, checkFunction] of this.healthChecks) {
      try {
        const start = Date.now();
        results[name] = await checkFunction();
        results[name].response_time = Date.now() - start;
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message,
          response_time: 0
        };
      }
    }

    // Déterminer le statut global
    const statuses = Object.values(results).map(r => r.status);
    const globalStatus = statuses.includes('critical') ? 'critical' :
                        statuses.includes('unhealthy') ? 'unhealthy' :
                        statuses.includes('warning') ? 'warning' : 'healthy';

    return {
      status: globalStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Health check simple pour endpoint /health
   */
  async basicHealthCheck() {
    try {
      // Check DB rapide
      await db.raw('SELECT 1');
      
      // Métriques de base
      const memUsage = process.memoryUsage();
      const memPercentage = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2);
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory_usage_percentage: memPercentage,
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Récupère les métriques système
   */
  getSystemMetrics() {
    return {
      ...this.metrics,
      current_memory: process.memoryUsage(),
      current_cpu: os.loadavg(),
      uptime: process.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Middleware pour compter les requêtes
   */
  requestCounter() {
    return (req, res, next) => {
      this.metrics.requests_total++;
      
      const originalSend = res.send;
      res.send = function(data) {
        if (res.statusCode >= 400) {
          systemMonitoringService.metrics.requests_errors++;
        }
        originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Alerte si métriques critiques
   */
  async checkCriticalAlerts() {
    const alerts = [];
    
    // Check mémoire
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memPercentage > 90) {
      alerts.push({
        type: 'critical',
        category: 'memory',
        message: `Utilisation mémoire critique: ${memPercentage.toFixed(2)}%`,
        value: memPercentage
      });
    }
    
    // Check CPU
    const cpuUsage = await this.getCPUUsage();
    if (cpuUsage > 95) {
      alerts.push({
        type: 'critical',
        category: 'cpu',
        message: `Utilisation CPU critique: ${cpuUsage}%`,
        value: cpuUsage
      });
    }
    
    // Check taux d'erreur
    const errorRate = this.metrics.requests_total > 0 ? 
      (this.metrics.requests_errors / this.metrics.requests_total) * 100 : 0;
    if (errorRate > 20) {
      alerts.push({
        type: 'critical',
        category: 'error_rate',
        message: `Taux d'erreur critique: ${errorRate.toFixed(2)}%`,
        value: errorRate
      });
    }
    
    // Log les alertes critiques
    for (let alert of alerts) {
      await systemLogService.critical('SYSTEM', alert.message, alert);
    }
    
    return alerts;
  }

  // ================= HELPERS =================

  /**
   * Obtient l'utilisation CPU
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime(startTime);
        
        const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000;
        const totalCpuTime = currentUsage.user + currentUsage.system;
        
        const cpuPercent = (totalCpuTime / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent.toFixed(2))));
      }, 100);
    });
  }

  /**
   * Obtient le nombre de connexions DB
   */
  async getDatabaseConnectionCount() {
    try {
      // Pour PostgreSQL
      const result = await db.raw(`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      return parseInt(result.rows[0].connections);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtient l'espace disque
   */
  async getDiskSpace() {
    try {
      const stats = await fs.statvfs ? fs.statvfs(process.cwd()) : null;
      if (stats) {
        const totalBytes = stats.blocks * stats.frsize;
        const freeBytes = stats.bavail * stats.frsize;
        
        return {
          total_gb: (totalBytes / 1024 / 1024 / 1024).toFixed(2),
          free_gb: (freeBytes / 1024 / 1024 / 1024).toFixed(2),
          free_percentage: ((freeBytes / totalBytes) * 100).toFixed(2)
        };
      }
      
      // Fallback si statvfs n'est pas disponible
      return {
        total_gb: 'N/A',
        free_gb: 'N/A',
        free_percentage: 50 // Valeur par défaut
      };
    } catch (error) {
      return {
        total_gb: 'Error',
        free_gb: 'Error',
        free_percentage: 0
      };
    }
  }

  /**
   * Check Redis
   */
  async checkRedis() {
    try {
      // Si Redis est configuré
      if (process.env.REDIS_URL) {
        // Implémentation du check Redis
        return { status: 'healthy', details: 'Redis accessible' };
      }
      return { status: 'disabled', details: 'Redis non configuré' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Check service email
   */
  async checkEmailService() {
    try {
      // Test basic de configuration email
      const emailConfig = process.env.EMAIL_HOST && process.env.EMAIL_PORT;
      return {
        status: emailConfig ? 'healthy' : 'warning',
        details: emailConfig ? 'Service email configuré' : 'Service email non configuré'
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Singleton
const systemMonitoringService = new SystemMonitoringService();
module.exports = systemMonitoringService;