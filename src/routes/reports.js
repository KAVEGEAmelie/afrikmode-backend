const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth: auth } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

// ================= RAPPORTS MANUELS =================

/**
 * POST /api/reports/generate
 * Génère un rapport manuel
 */
router.post('/generate', [
  auth,
  body('type')
    .isIn(['sales', 'inventory', 'customers', 'orders'])
    .withMessage('Type de rapport invalide'),
  body('format')
    .optional()
    .isIn(['pdf', 'excel', 'xlsx', 'csv'])
    .withMessage('Format invalide'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Les filtres doivent être un objet')
], reportController.generateReport);

/**
 * GET /api/reports/download/:reportId
 * Télécharge un fichier de rapport
 */
router.get('/download/:reportId', [
  auth,
  param('reportId').isUUID().withMessage('ID de rapport invalide')
], reportController.downloadReport);

/**
 * GET /api/reports/history
 * Récupère l'historique des rapports
 */
router.get('/history', [
  auth,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide (1-100)')
], reportController.getReportHistory);

// ================= RAPPORTS PROGRAMMÉS =================

/**
 * POST /api/reports/scheduled
 * Crée un rapport programmé
 */
router.post('/scheduled', [
  auth,
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Nom requis (1-255 caractères)'),
  body('type')
    .isIn(['sales', 'inventory', 'customers', 'orders'])
    .withMessage('Type de rapport invalide'),
  body('format')
    .optional()
    .isIn(['pdf', 'excel', 'xlsx', 'csv'])
    .withMessage('Format invalide'),
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Fréquence invalide'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Au moins un destinataire requis'),
  body('recipients.*')
    .isEmail()
    .withMessage('Email invalide dans les destinataires'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Les filtres doivent être un objet')
], reportController.createScheduledReport);

/**
 * GET /api/reports/scheduled
 * Récupère les rapports programmés
 */
router.get('/scheduled', [
  auth,
  query('include_inactive')
    .optional()
    .isBoolean()
    .withMessage('include_inactive doit être boolean')
], reportController.getScheduledReports);

/**
 * GET /api/reports/scheduled/:reportId
 * Récupère un rapport programmé spécifique
 */
router.get('/scheduled/:reportId', [
  auth,
  param('reportId').isUUID().withMessage('ID de rapport invalide')
], reportController.getScheduledReport);

/**
 * PUT /api/reports/scheduled/:reportId
 * Met à jour un rapport programmé
 */
router.put('/scheduled/:reportId', [
  auth,
  param('reportId').isUUID().withMessage('ID de rapport invalide'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Nom invalide (1-255 caractères)'),
  body('type')
    .optional()
    .isIn(['sales', 'inventory', 'customers', 'orders'])
    .withMessage('Type de rapport invalide'),
  body('format')
    .optional()
    .isIn(['pdf', 'excel', 'xlsx', 'csv'])
    .withMessage('Format invalide'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Fréquence invalide'),
  body('recipients')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Au moins un destinataire requis'),
  body('recipients.*')
    .optional()
    .isEmail()
    .withMessage('Email invalide dans les destinataires'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Les filtres doivent être un objet')
], reportController.updateScheduledReport);

/**
 * PATCH /api/reports/scheduled/:reportId/toggle
 * Active/désactive un rapport programmé
 */
router.patch('/scheduled/:reportId/toggle', [
  auth,
  param('reportId').isUUID().withMessage('ID de rapport invalide'),
  body('is_active')
    .isBoolean()
    .withMessage('is_active doit être boolean')
], reportController.toggleScheduledReport);

/**
 * DELETE /api/reports/scheduled/:reportId
 * Supprime un rapport programmé
 */
router.delete('/scheduled/:reportId', [
  auth,
  param('reportId').isUUID().withMessage('ID de rapport invalide')
], reportController.deleteScheduledReport);

/**
 * POST /api/reports/scheduled/:reportId/execute
 * Exécute immédiatement un rapport programmé
 */
router.post('/scheduled/:reportId/execute', [
  auth,
  param('reportId').isUUID().withMessage('ID de rapport invalide')
], reportController.executeScheduledReportNow);

// ================= ADMINISTRATION =================

/**
 * GET /api/reports/statistics
 * Statistiques des rapports (admin seulement)
 */
router.get('/statistics', auth, reportController.getReportsStatistics);

/**
 * POST /api/reports/cleanup
 * Nettoie les rapports expirés (admin seulement)
 */
router.post('/cleanup', auth, reportController.cleanExpiredReports);

module.exports = router;