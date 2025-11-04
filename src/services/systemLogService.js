const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Service de logging avancé pour système
 */
class SystemLogService {
  constructor() {
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
    
    this.categories = {
      AUTH: 'auth',
      USER_ACTION: 'user_action',
      SYSTEM: 'system',
      API: 'api',
      SECURITY: 'security',
      PAYMENT: 'payment',
      ORDER: 'order',
      ADMIN: 'admin'
    };
    
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Erreur création dossier logs:', error);
    }
  }

  /**
   * Log générique
   */
  async log(level, category, message, metadata = {}, req = null) {
    try {
      const logData = {
        level: level.toLowerCase(),
        category,
        message,
        metadata: JSON.stringify(metadata),
        environment: process.env.NODE_ENV || 'development'
      };

      // Extraire les données de la requête si disponible
      if (req) {
        logData.user_id = req.user?.id || null;
        logData.user_role = req.user?.role || null;
        logData.ip_address = this.getClientIP(req);
        logData.user_agent = req.get('User-Agent') || null;
        logData.endpoint = req.originalUrl || req.url || null;
        logData.method = req.method || null;
        logData.session_id = req.sessionID || null;
        
        // Données de requête (sans informations sensibles)
        if (req.body) {
          const sanitizedBody = this.sanitizeRequestData(req.body);
          logData.request_data = JSON.stringify(sanitizedBody);
        }
      }

      // Sauvegarder en base de données
      await db('system_logs').insert(logData);

      // Log également dans les fichiers (optionnel)
      await this.writeToFile(level, category, message, metadata, req);

    } catch (error) {
      console.error('Erreur lors du logging:', error);
    }
  }

  /**
   * Log spécifiques par niveau
   */
  async debug(category, message, metadata = {}, req = null) {
    return this.log('DEBUG', category, message, metadata, req);
  }

  async info(category, message, metadata = {}, req = null) {
    return this.log('INFO', category, message, metadata, req);
  }

  async warn(category, message, metadata = {}, req = null) {
    return this.log('WARN', category, message, metadata, req);
  }

  async error(category, message, metadata = {}, req = null, error = null) {
    if (error && error.stack) {
      metadata.error_stack = error.stack;
    }
    return this.log('ERROR', category, message, metadata, req);
  }

  async critical(category, message, metadata = {}, req = null, error = null) {
    if (error && error.stack) {
      metadata.error_stack = error.stack;
    }
    return this.log('CRITICAL', category, message, metadata, req);
  }

  /**
   * Logs spécialisés par catégorie
   */
  async logAuth(action, message, metadata = {}, req = null) {
    return this.info(this.categories.AUTH, message, { action, ...metadata }, req);
  }

  async logUserAction(userId, action, message, metadata = {}, req = null) {
    return this.info(this.categories.USER_ACTION, message, { 
      user_id: userId, 
      action, 
      ...metadata 
    }, req);
  }

  async logSecurity(action, message, metadata = {}, req = null) {
    return this.warn(this.categories.SECURITY, message, { action, ...metadata }, req);
  }

  async logPayment(orderId, action, message, metadata = {}, req = null) {
    return this.info(this.categories.PAYMENT, message, { 
      order_id: orderId, 
      action, 
      ...metadata 
    }, req);
  }

  async logApi(endpoint, method, status, responseTime, metadata = {}, req = null) {
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const message = `${method} ${endpoint} - ${status} (${responseTime}ms)`;
    
    const logData = {
      response_status: status,
      response_time: responseTime,
      ...metadata
    };

    return this.log(level, this.categories.API, message, logData, req);
  }

  /**
   * Middleware de logging automatique des requêtes API
   */
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Capturer la réponse
      const originalSend = res.send;
      res.send = function(data) {
        const responseTime = Date.now() - start;
        
        // Log de la requête
        systemLogService.logApi(
          req.originalUrl || req.url,
          req.method,
          res.statusCode,
          responseTime,
          {
            query_params: req.query,
            params: req.params
          },
          req
        ).catch(console.error);
        
        originalSend.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Middleware de logging des erreurs
   */
  errorLogger() {
    return (error, req, res, next) => {
      this.error(
        this.categories.API,
        `Erreur API: ${error.message}`,
        {
          error_type: error.name,
          stack_trace: error.stack
        },
        req,
        error
      ).catch(console.error);

      next(error);
    };
  }

  /**
   * Récupère les logs avec filtres
   */
  async getLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let query = db('system_logs')
        .leftJoin('users', 'system_logs.user_id', 'users.id')
        .select(
          'system_logs.*',
          'users.first_name',
          'users.last_name',
          'users.email'
        )
        .orderBy('system_logs.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Appliquer les filtres
      if (filters.level) {
        query = query.where('system_logs.level', filters.level);
      }
      
      if (filters.category) {
        query = query.where('system_logs.category', filters.category);
      }
      
      if (filters.user_id) {
        query = query.where('system_logs.user_id', filters.user_id);
      }
      
      if (filters.start_date) {
        query = query.where('system_logs.created_at', '>=', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.where('system_logs.created_at', '<=', filters.end_date);
      }
      
      if (filters.ip_address) {
        query = query.where('system_logs.ip_address', filters.ip_address);
      }
      
      if (filters.endpoint) {
        query = query.where('system_logs.endpoint', 'like', `%${filters.endpoint}%`);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('system_logs.message', 'like', `%${filters.search}%`)
              .orWhere('system_logs.action', 'like', `%${filters.search}%`);
        });
      }

      const logs = await query;

      // Parser les champs JSON
      return logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : {},
        request_data: log.request_data ? JSON.parse(log.request_data) : {},
        error_stack: log.error_stack ? JSON.parse(log.error_stack) : null
      }));

    } catch (error) {
      console.error('Erreur récupération logs:', error);
      throw error;
    }
  }

  /**
   * Statistiques des logs
   */
  async getLogStatistics(timeframe = '7d') {
    try {
      let startDate;
      
      switch (timeframe) {
        case '1d':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      // Statistiques par niveau
      const byLevel = await db('system_logs')
        .select('level')
        .count('* as count')
        .where('created_at', '>=', startDate)
        .groupBy('level');

      // Statistiques par catégorie
      const byCategory = await db('system_logs')
        .select('category')
        .count('* as count')
        .where('created_at', '>=', startDate)
        .groupBy('category');

      // Top des endpoints les plus appelés
      const topEndpoints = await db('system_logs')
        .select('endpoint', 'method')
        .count('* as count')
        .where('created_at', '>=', startDate)
        .whereNotNull('endpoint')
        .groupBy('endpoint', 'method')
        .orderBy('count', 'desc')
        .limit(10);

      // Top des adresses IP
      const topIPs = await db('system_logs')
        .select('ip_address')
        .count('* as count')
        .where('created_at', '>=', startDate)
        .whereNotNull('ip_address')
        .groupBy('ip_address')
        .orderBy('count', 'desc')
        .limit(10);

      // Erreurs récentes
      const recentErrors = await db('system_logs')
        .select('level', 'category', 'message', 'created_at')
        .whereIn('level', ['error', 'critical'])
        .where('created_at', '>=', startDate)
        .orderBy('created_at', 'desc')
        .limit(20);

      // Temps de réponse moyens
      const avgResponseTime = await db('system_logs')
        .avg('response_time as avg_time')
        .where('created_at', '>=', startDate)
        .whereNotNull('response_time')
        .first();

      return {
        timeframe,
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        },
        by_level: byLevel.reduce((acc, item) => {
          acc[item.level] = parseInt(item.count);
          return acc;
        }, {}),
        by_category: byCategory.reduce((acc, item) => {
          acc[item.category] = parseInt(item.count);
          return acc;
        }, {}),
        top_endpoints: topEndpoints,
        top_ips: topIPs,
        recent_errors: recentErrors,
        avg_response_time: parseFloat(avgResponseTime?.avg_time || 0)
      };

    } catch (error) {
      console.error('Erreur statistiques logs:', error);
      throw error;
    }
  }

  /**
   * Nettoie les anciens logs
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const deletedCount = await db('system_logs')
        .where('created_at', '<', cutoffDate)
        .del();

      console.log(`🧹 ${deletedCount} anciens logs supprimés (> ${daysToKeep} jours)`);
      return deletedCount;
      
    } catch (error) {
      console.error('Erreur nettoyage logs:', error);
      throw error;
    }
  }

  /**
   * Export des logs en CSV
   */
  async exportLogs(filters = {}) {
    try {
      const logs = await this.getLogs(filters, 10000); // Maximum 10k logs

      const csvHeader = [
        'Date/Heure', 'Niveau', 'Catégorie', 'Action', 'Message', 'Utilisateur', 
        'IP', 'Endpoint', 'Méthode', 'Statut', 'Temps réponse (ms)', 'User Agent'
      ];

      const csvData = logs.map(log => [
        new Date(log.created_at).toLocaleString('fr-FR'),
        log.level,
        log.category,
        log.action || '',
        log.message,
        log.first_name && log.last_name ? `${log.first_name} ${log.last_name}` : log.email || '',
        log.ip_address || '',
        log.endpoint || '',
        log.method || '',
        log.response_status || '',
        log.response_time || '',
        log.user_agent || ''
      ]);

      const csvContent = [csvHeader, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;

    } catch (error) {
      console.error('Erreur export logs:', error);
      throw error;
    }
  }

  // ================= HELPERS =================

  /**
   * Obtient l'IP réelle du client
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Nettoie les données de requête (retire les mots de passe, tokens, etc.)
   */
  sanitizeRequestData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'card_number', 'cvv', 'pin', 'ssn', 'social_security'
    ];

    const sanitized = { ...data };
    
    for (let key in sanitized) {
      if (sensitiveKeys.some(sensitive => 
          key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Écrit les logs dans des fichiers (backup)
   */
  async writeToFile(level, category, message, metadata, req) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `${dateStr}.log`;
      const filePath = path.join(this.logDir, fileName);

      const logEntry = {
        timestamp: now.toISOString(),
        level,
        category,
        message,
        metadata,
        user: req?.user?.id || null,
        ip: req ? this.getClientIP(req) : null,
        endpoint: req?.originalUrl || null
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(filePath, logLine, 'utf8');
      
    } catch (error) {
      console.error('Erreur écriture fichier log:', error);
    }
  }
}

// Singleton
const systemLogService = new SystemLogService();
module.exports = systemLogService;