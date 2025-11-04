/**
 * Middleware de gestion d'erreurs centralisé
 */

/**
 * Wrapper pour les fonctions async/await
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Erreurs communes prédéfinies
 */
const commonErrors = {
  badRequest: (message = 'Requête invalide') => {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = 'BAD_REQUEST';
    return error;
  },

  unauthorized: (message = 'Non autorisé') => {
    const error = new Error(message);
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return error;
  },

  forbidden: (message = 'Accès interdit') => {
    const error = new Error(message);
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    return error;
  },

  notFound: (message = 'Ressource non trouvée') => {
    const error = new Error(message);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    return error;
  },

  conflict: (message = 'Conflit de ressources') => {
    const error = new Error(message);
    error.statusCode = 409;
    error.code = 'CONFLICT';
    return error;
  },

  validation: (errors) => {
    const error = new Error('Erreurs de validation');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    return error;
  },

  tooManyRequests: (message = 'Trop de requêtes') => {
    const error = new Error(message);
    error.statusCode = 429;
    error.code = 'TOO_MANY_REQUESTS';
    return error;
  },

  serverError: (message = 'Erreur interne du serveur') => {
    const error = new Error(message);
    error.statusCode = 500;
    error.code = 'INTERNAL_SERVER_ERROR';
    return error;
  },

  serviceUnavailable: (message = 'Service indisponible') => {
    const error = new Error(message);
    error.statusCode = 503;
    error.code = 'SERVICE_UNAVAILABLE';
    return error;
  }
};

/**
 * Middleware principal de gestion d'erreurs
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  console.error('❌ Erreur API:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get ? req.get('User-Agent') : req.headers?.['user-agent'],
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = commonErrors.validation([message]);
  }

  // Erreur de clé dupliquée
  if (err.code === 11000) {
    const message = 'Ressource déjà existante';
    error = commonErrors.conflict(message);
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalide';
    error = commonErrors.unauthorized(message);
  }

  // Erreur JWT expiré
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expiré';
    error = commonErrors.unauthorized(message);
  }

  // Erreur de base de données
  if (err.code === 'ECONNREFUSED') {
    const message = 'Service de base de données indisponible';
    error = commonErrors.serviceUnavailable(message);
  }

  // Erreur de validation Joi
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = commonErrors.validation([message]);
  }

  // Erreur de validation express-validator
  if (err.type === 'validation') {
    error = commonErrors.validation(err.errors);
  }

  // Déterminer le code de statut
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  // Préparer la réponse d'erreur
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'Erreur interne du serveur',
      code: code,
      statusCode: statusCode
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Ajouter les détails de validation si présents
  if (error.details) {
    errorResponse.error.details = error.details;
    // Si c'est un objet avec des erreurs par champ, le formater
    if (typeof error.details === 'object' && !Array.isArray(error.details)) {
      errorResponse.error.errors = error.details;
    }
  }

  // Ajouter la stack trace en développement
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Ajouter des informations de debug en développement
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      user: req.user ? {
        id: req.user.id,
        role: req.user.role
      } : null,
      body: req.body,
      query: req.query,
      params: req.params
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware pour les routes non trouvées
 */
const notFound = (req, res, next) => {
  const error = commonErrors.notFound(`Route ${req.originalUrl} non trouvée`);
  next(error);
};

/**
 * Middleware pour valider les paramètres requis
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      const error = commonErrors.badRequest(`Champs requis manquants: ${missing.join(', ')}`);
      return next(error);
    }
    
    next();
  };
};

/**
 * Middleware pour valider les types de données
 */
const validateTypes = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, expectedType] of Object.entries(schema)) {
      const value = req.body[field];
      
      if (value !== undefined) {
        const actualType = typeof value;
        
        if (actualType !== expectedType) {
          errors.push(`${field} doit être de type ${expectedType}, reçu ${actualType}`);
        }
      }
    }
    
    if (errors.length > 0) {
      const error = commonErrors.validation(errors);
      return next(error);
    }
    
    next();
  };
};

/**
 * Middleware pour gérer les erreurs de base de données
 */
const handleDatabaseError = (err, req, res, next) => {
  if (err.code) {
    switch (err.code) {
      case '23505': // Violation de contrainte unique
        return next(commonErrors.conflict('Cette ressource existe déjà'));
      
      case '23503': // Violation de clé étrangère
        return next(commonErrors.badRequest('Référence invalide'));
      
      case '23502': // Violation de contrainte NOT NULL
        return next(commonErrors.badRequest('Champ requis manquant'));
      
      case '42P01': // Table n'existe pas
        return next(commonErrors.serverError('Erreur de configuration de base de données'));
      
      default:
        console.error('Erreur base de données non gérée:', err);
        return next(commonErrors.serverError('Erreur de base de données'));
    }
  }
  
  next(err);
};

/**
 * Middleware pour les erreurs de rate limiting
 */
const handleRateLimitError = (err, req, res, next) => {
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Trop de requêtes',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: err.retryAfter || 60
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};

/**
 * Middleware pour les erreurs de sécurité
 */
const handleSecurityError = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Accès non autorisé',
        code: 'UNAUTHORIZED',
        statusCode: 401
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};

module.exports = {
  asyncHandler,
  commonErrors,
  errorHandler,
  notFound,
  validateRequired,
  validateTypes,
  handleDatabaseError,
  handleRateLimitError,
  handleSecurityError
};