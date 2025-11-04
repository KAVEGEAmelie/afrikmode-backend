/**
 * RESPONSE HANDLER UTILITIES
 * Standardized response formatting for the API
 */

/**
 * Send success response
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send error response
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (error && process.env.NODE_ENV === 'development') {
    response.error = error.message;
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
const sendValidationError = (res, errors, message = 'Validation Error') => {
  return res.status(400).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send not found response
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send unauthorized response
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send forbidden response
 */
const sendForbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send paginated response
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
      hasNext: pagination.page < pagination.pages,
      hasPrev: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Send created response
 */
const sendCreated = (res, data, message = 'Resource created successfully') => {
  return res.status(201).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send no content response
 */
const sendNoContent = (res, message = 'No content') => {
  return res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send conflict response
 */
const sendConflict = (res, message = 'Conflict') => {
  return res.status(409).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send too many requests response
 */
const sendTooManyRequests = (res, message = 'Too many requests') => {
  return res.status(429).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send service unavailable response
 */
const sendServiceUnavailable = (res, message = 'Service unavailable') => {
  return res.status(503).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Handle async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle database errors
 */
const handleDatabaseError = (error, res) => {
  console.error('Database error:', error);
  
  if (error.code === '23505') {
    return sendConflict(res, 'Resource already exists');
  }
  
  if (error.code === '23503') {
    return sendConflict(res, 'Foreign key constraint violation');
  }
  
  if (error.code === '23502') {
    return sendValidationError(res, { field: 'Required field missing' });
  }
  
  return sendError(res, 'Database error occurred', 500, error);
};

/**
 * Handle validation errors
 */
const handleValidationError = (error, res) => {
  const errors = {};
  
  if (error.details) {
    error.details.forEach(detail => {
      errors[detail.path] = detail.message;
    });
  }
  
  return sendValidationError(res, errors);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error, res) => {
  if (error.name === 'JsonWebTokenError') {
    return sendUnauthorized(res, 'Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return sendUnauthorized(res, 'Token expired');
  }
  
  return sendUnauthorized(res, 'Authentication failed');
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendConflict,
  sendTooManyRequests,
  sendServiceUnavailable,
  asyncHandler,
  handleDatabaseError,
  handleValidationError,
  handleJWTError
};










