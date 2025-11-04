const express = require('express');
const { body, query, param } = require('express-validator');
const { requireAuth: auth } = require('../middleware/auth');
const securityController = require('../controllers/securityController');
const systemMonitoringService = require('../services/systemMonitoringService');
const systemLogService = require('../services/systemLogService');

const router = express.Router();

// ================= HEALTH CHECKS =================

/**
 * GET /api/security/health
 * Health check basique (public)
 */
router.get('/health', async (req, res) => {
  const healthData = await systemMonitoringService.basicHealthCheck();
  res.status(healthData.status === 'healthy' ? 200 : 503).json(healthData);
});

/**
 * GET /api/security/health/detailed
 * Health check détaillé (admin seulement)
 */
router.get('/health/detailed', auth, securityController.getDetailedHealthCheck);

/**
 * GET /api/security/metrics
 * Métriques système (admin seulement)
 */
router.get('/metrics', auth, securityController.getSystemMetrics);

/**
 * GET /api/security/alerts
 * Vérification des alertes critiques (admin seulement)
 */
router.get('/alerts', auth, securityController.checkCriticalAlerts);

// ================= RATE LIMITING =================

/**
 * GET /api/security/rate-limits
 * Statistiques de rate limiting (admin seulement)
 */
router.get('/rate-limits', auth, securityController.getRateLimitStats);

/**
 * POST /api/security/rate-limits/reset
 * Réinitialise les compteurs de rate limiting (admin seulement)
 */
router.post('/rate-limits/reset', [
  auth,
  body('userId').isUUID().withMessage('ID utilisateur invalide'),
  body('limitType').isIn(['admin', 'seller', 'customer', 'anonymous', 'critical', 'auth', 'public_api', 'upload']).withMessage('Type de limite invalide')
], securityController.resetUserRateLimit);

// ================= SYSTEM LOGS =================

/**
 * GET /api/security/logs
 * Récupère les logs système avec filtres (admin seulement)
 */
router.get('/logs', [
  auth,
  query('level').optional().isIn(['debug', 'info', 'warn', 'error', 'critical']).withMessage('Niveau invalide'),
  query('category').optional().isIn(['auth', 'user_action', 'system', 'api', 'security', 'payment', 'order', 'admin']).withMessage('Catégorie invalide'),
  query('user_id').optional().isUUID().withMessage('ID utilisateur invalide'),
  query('start_date').optional().isISO8601().withMessage('Date de début invalide'),
  query('end_date').optional().isISO8601().withMessage('Date de fin invalide'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limite invalide (1-1000)'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset invalide')
], securityController.getSystemLogs);

/**
 * GET /api/security/logs/statistics
 * Statistiques des logs (admin seulement)
 */
router.get('/logs/statistics', [
  auth,
  query('timeframe').optional().isIn(['1d', '7d', '30d']).withMessage('Période invalide')
], securityController.getLogStatistics);

/**
 * GET /api/security/logs/export
 * Exporte les logs en CSV (admin seulement)
 */
router.get('/logs/export', [
  auth,
  query('level').optional().isIn(['debug', 'info', 'warn', 'error', 'critical']).withMessage('Niveau invalide'),
  query('category').optional().isIn(['auth', 'user_action', 'system', 'api', 'security', 'payment', 'order', 'admin']).withMessage('Catégorie invalide'),
  query('user_id').optional().isUUID().withMessage('ID utilisateur invalide'),
  query('start_date').optional().isISO8601().withMessage('Date de début invalide'),
  query('end_date').optional().isISO8601().withMessage('Date de fin invalide')
], securityController.exportLogs);

/**
 * POST /api/security/logs/cleanup
 * Nettoie les anciens logs (admin seulement)
 */
router.post('/logs/cleanup', [
  auth,
  body('days_to_keep').optional().isInt({ min: 1, max: 365 }).withMessage('Nombre de jours invalide (1-365)')
], securityController.cleanOldLogs);

// ================= DASHBOARD & REPORTS =================

/**
 * GET /api/security/dashboard
 * Tableau de bord sécurité (admin seulement)
 */
router.get('/dashboard', auth, securityController.getSecurityDashboard);

/**
 * GET /api/security/report
 * Génère un rapport de sécurité détaillé (admin seulement)
 */
router.get('/report', [
  auth,
  query('timeframe').optional().isIn(['1d', '7d', '30d']).withMessage('Période invalide')
], securityController.generateSecurityReport);

// ================= MIDDLEWARES DE LOGGING =================

// Appliquer le middleware de logging des requêtes à toutes les routes sécurisées
router.use(systemLogService.requestLogger());

// Middleware de logging des erreurs
router.use(systemLogService.errorLogger());

// Middleware de comptage des requêtes pour monitoring
router.use(systemMonitoringService.requestCounter());

module.exports = router;