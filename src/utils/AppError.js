/**
 * CUSTOM APPLICATION ERROR CLASS
 * Extends the built-in Error class with additional properties
 */

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a new AppError instance
 */
const createError = (message, statusCode = 500, isOperational = true) => {
  return new AppError(message, statusCode, isOperational);
};

/**
 * Common error messages
 */
const ERROR_MESSAGES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Non autorisé',
  FORBIDDEN: 'Accès refusé',
  TOKEN_INVALID: 'Token invalide',
  TOKEN_EXPIRED: 'Token expiré',
  ROLE_REQUIRED: 'Rôle requis manquant',
  
  // User related
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  USER_ALREADY_EXISTS: 'Utilisateur déjà existant',
  INVALID_CREDENTIALS: 'Identifiants invalides',
  ACCOUNT_DISABLED: 'Compte désactivé',
  
  // Product related
  PRODUCT_NOT_FOUND: 'Produit non trouvé',
  PRODUCT_OUT_OF_STOCK: 'Produit en rupture de stock',
  INVALID_PRODUCT_DATA: 'Données produit invalides',
  
  // Order related
  ORDER_NOT_FOUND: 'Commande non trouvée',
  ORDER_CANNOT_BE_MODIFIED: 'Commande ne peut pas être modifiée',
  INVALID_ORDER_STATUS: 'Statut de commande invalide',
  
  // Payment related
  PAYMENT_FAILED: 'Paiement échoué',
  PAYMENT_ALREADY_PROCESSED: 'Paiement déjà traité',
  INVALID_PAYMENT_METHOD: 'Méthode de paiement invalide',
  
  // Validation
  VALIDATION_ERROR: 'Erreur de validation',
  REQUIRED_FIELD: 'Champ requis manquant',
  INVALID_FORMAT: 'Format invalide',
  INVALID_EMAIL: 'Email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  
  // Database
  DATABASE_ERROR: 'Erreur de base de données',
  DUPLICATE_ENTRY: 'Entrée dupliquée',
  FOREIGN_KEY_CONSTRAINT: 'Contrainte de clé étrangère',
  
  // File upload
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier invalide',
  UPLOAD_FAILED: 'Échec de l\'upload',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'Trop de requêtes',
  RATE_LIMIT_EXCEEDED: 'Limite de taux dépassée',
  
  // Server
  INTERNAL_ERROR: 'Erreur interne du serveur',
  SERVICE_UNAVAILABLE: 'Service indisponible',
  MAINTENANCE_MODE: 'Mode maintenance'
};

/**
 * Common status codes
 */
const STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Create specific error types
 */
const createValidationError = (message = ERROR_MESSAGES.VALIDATION_ERROR) => {
  return new AppError(message, STATUS_CODES.UNPROCESSABLE_ENTITY);
};

const createNotFoundError = (message = ERROR_MESSAGES.NOT_FOUND) => {
  return new AppError(message, STATUS_CODES.NOT_FOUND);
};

const createUnauthorizedError = (message = ERROR_MESSAGES.UNAUTHORIZED) => {
  return new AppError(message, STATUS_CODES.UNAUTHORIZED);
};

const createForbiddenError = (message = ERROR_MESSAGES.FORBIDDEN) => {
  return new AppError(message, STATUS_CODES.FORBIDDEN);
};

const createConflictError = (message = ERROR_MESSAGES.CONFLICT) => {
  return new AppError(message, STATUS_CODES.CONFLICT);
};

const createInternalError = (message = ERROR_MESSAGES.INTERNAL_ERROR) => {
  return new AppError(message, STATUS_CODES.INTERNAL_SERVER_ERROR);
};

/**
 * Check if error is operational
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Convert error to AppError
 */
const convertToAppError = (error) => {
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return createValidationError(error.message);
  }
  
  if (error.name === 'CastError') {
    return createNotFoundError('Ressource non trouvée');
  }
  
  if (error.code === 11000) {
    return createConflictError('Ressource déjà existante');
  }
  
  if (error.name === 'JsonWebTokenError') {
    return createUnauthorizedError('Token invalide');
  }
  
  if (error.name === 'TokenExpiredError') {
    return createUnauthorizedError('Token expiré');
  }
  
  // Default to internal server error
  return createInternalError();
};

module.exports = {
  AppError,
  createError,
  ERROR_MESSAGES,
  STATUS_CODES,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  createInternalError,
  isOperationalError,
  convertToAppError
};










