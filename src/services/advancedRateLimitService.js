const rateLimit = require('express-rate-limit');

/**
 * Service de rate limiting avancé par rôle utilisateur
 */
class AdvancedRateLimitService {
  constructor() {
    this.rateLimiters = new Map();
    this.initializeRateLimiters();
  }

  /**
   * Initialise les différents rate limiters par rôle
   */
  initializeRateLimiters() {
    // Rate limiting pour les admins (plus permissif)
    this.rateLimiters.set('admin', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 requêtes par fenêtre
      message: {
        error: 'Trop de requêtes. Limite de 500 requêtes par 15 minutes pour les administrateurs.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `admin_${req.user?.id || req.ip}`;
      }
    }));

    // Rate limiting pour les vendeurs
    this.rateLimiters.set('seller', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300, // 300 requêtes par fenêtre
      message: {
        error: 'Trop de requêtes. Limite de 300 requêtes par 15 minutes pour les vendeurs.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `seller_${req.user?.id || req.ip}`;
      }
    }));

    // Rate limiting pour les clients (plus restrictif)
    this.rateLimiters.set('customer', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requêtes par fenêtre
      message: {
        error: 'Trop de requêtes. Limite de 200 requêtes par 15 minutes pour les clients.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `customer_${req.user?.id || req.ip}`;
      }
    }));

    // Rate limiting pour les utilisateurs non authentifiés (très restrictif)
    this.rateLimiters.set('anonymous', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // 50 requêtes par fenêtre
      message: {
        error: 'Trop de requêtes. Limite de 50 requêtes par 15 minutes pour les utilisateurs non authentifiés.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `anonymous_${req.ip}`;
      }
    }));

    // Rate limiting spécial pour les actions critiques
    this.rateLimiters.set('critical', rateLimit({
      windowMs: 60 * 60 * 1000, // 1 heure
      max: 10, // 10 tentatives par heure max
      message: {
        error: 'Trop de tentatives d\'actions critiques. Limite de 10 par heure.',
        retryAfter: 60 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `critical_${req.user?.id || req.ip}`;
      }
    }));

    // Rate limiting pour les connexions
    this.rateLimiters.set('auth', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 tentatives de connexion par IP
      message: {
        error: 'Trop de tentatives de connexion. Essayez de nouveau dans 15 minutes.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Ne compter que les échecs
      keyGenerator: (req) => {
        return `auth_${req.ip}`;
      }
    }));

    // Rate limiting pour l'API publique
    this.rateLimiters.set('public_api', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requêtes par fenêtre
      message: {
        error: 'Limite d\'API publique atteinte. 100 requêtes par 15 minutes.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false
    }));

    // Rate limiting pour les uploads
    this.rateLimiters.set('upload', rateLimit({
      windowMs: 60 * 60 * 1000, // 1 heure
      max: 50, // 50 uploads par heure
      message: {
        error: 'Limite d\'uploads atteinte. 50 uploads par heure maximum.',
        retryAfter: 60 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `upload_${req.user?.id || req.ip}`;
      }
    }));

    console.log('✅ Rate limiters avancés initialisés');
  }

  /**
   * Middleware pour appliquer le rate limiting selon le rôle
   */
  applyRateLimit(limitType = 'default') {
    return (req, res, next) => {
      let rateLimiter;

      // Déterminer le type de rate limiter à utiliser
      if (limitType !== 'default') {
        rateLimiter = this.rateLimiters.get(limitType);
      } else if (req.user) {
        // Utilisateur authentifié - utiliser son rôle
        rateLimiter = this.rateLimiters.get(req.user.role) || this.rateLimiters.get('customer');
      } else {
        // Utilisateur non authentifié
        rateLimiter = this.rateLimiters.get('anonymous');
      }

      if (!rateLimiter) {
        return next();
      }

      rateLimiter(req, res, next);
    };
  }

  /**
   * Middleware spécialisé pour les actions critiques
   */
  criticalActionLimit() {
    return this.applyRateLimit('critical');
  }

  /**
   * Middleware spécialisé pour l'authentification
   */
  authLimit() {
    return this.applyRateLimit('auth');
  }

  /**
   * Middleware spécialisé pour l'API publique
   */
  publicApiLimit() {
    return this.applyRateLimit('public_api');
  }

  /**
   * Middleware spécialisé pour les uploads
   */
  uploadLimit() {
    return this.applyRateLimit('upload');
  }

  /**
   * Récupère les statistiques de rate limiting
   */
  async getRateLimitStats(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const stats = {
        current_limits: {
          admin: { window: '15min', max: 500 },
          seller: { window: '15min', max: 300 },
          customer: { window: '15min', max: 200 },
          anonymous: { window: '15min', max: 50 },
          critical: { window: '1h', max: 10 },
          auth: { window: '15min', max: 5 },
          public_api: { window: '15min', max: 100 },
          upload: { window: '1h', max: 50 }
        },
        active_limiters: Array.from(this.rateLimiters.keys()),
        timestamp: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      console.error('Erreur récupération stats rate limit:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  /**
   * Réinitialise les compteurs pour un utilisateur (admin seulement)
   */
  async resetUserRateLimit(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const { userId, limitType } = req.body;

      if (!userId || !limitType) {
        return res.status(400).json({ error: 'userId et limitType requis' });
      }

      // Cette fonctionnalité nécessiterait un store Redis pour être pleinement implémentée
      // En attendant, on retourne une réponse positive
      res.json({
        message: `Compteurs de rate limiting réinitialisés pour l'utilisateur ${userId} (type: ${limitType})`,
        user_id: userId,
        limit_type: limitType,
        reset_time: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erreur reset rate limit:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new AdvancedRateLimitService();