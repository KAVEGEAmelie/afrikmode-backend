const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const mediaAdminController = require('../controllers/mediaAdminController');
const { requireAuth: authenticate } = require('../middleware/auth');
const { imageUpload, validateUploadedImages, cleanupTempFiles } = require('../middleware/upload');
const { body, query, param } = require('express-validator');

// Validation pour l'upload d'image
const uploadImageValidation = [
  body('category')
    .optional()
    .isIn(['products', 'stores', 'users', 'general'])
    .withMessage('Catégorie invalide'),
  body('addWatermark')
    .optional()
    .isBoolean()
    .withMessage('addWatermark doit être un booléen')
];

// Validation pour la liste des médias
const getMediasValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page doit être un entier positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit doit être entre 1 et 100'),
  query('category')
    .optional()
    .isIn(['products', 'stores', 'users', 'general'])
    .withMessage('Catégorie invalide'),
  query('sortBy')
    .optional()
    .isIn(['created_at', 'original_name', 'file_size', 'category'])
    .withMessage('Champ de tri invalide'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordre de tri invalide')
];

// Validation pour l'ID de média
const mediaIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de média invalide')
];

// Validation pour l'URL signée
const signedUrlValidation = [
  ...mediaIdValidation,
  query('size')
    .optional()
    .isIn(['thumbnail', 'small', 'medium', 'large', 'original'])
    .withMessage('Taille invalide'),
  query('expiresIn')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('expiresIn doit être entre 60 et 86400 secondes')
];

// Validation pour la configuration du filigrane
const watermarkConfigValidation = [
  body('position')
    .optional()
    .isIn(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
    .withMessage('Position invalide'),
  body('margin')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Margin doit être entre 0 et 100'),
  body('opacity')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Opacity doit être entre 0 et 1')
];

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Gestion des médias avec CDN et traitement d'images
 */

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload et traitement d'une image
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image à uploader
 *               category:
 *                 type: string
 *                 enum: [products, stores, users, general]
 *                 default: general
 *               addWatermark:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Image uploadée et traitée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.post('/upload', 
  authenticate, 
  cleanupTempFiles,
  imageUpload.single('file'), 
  validateUploadedImages,
  uploadImageValidation, 
  mediaController.uploadImage
);

/**
 * @swagger
 * /api/media/upload-multiple:
 *   post:
 *     summary: Upload multiple d'images
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               category:
 *                 type: string
 *                 enum: [products, stores, users, general]
 *                 default: general
 *               addWatermark:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Images traitées avec succès
 */
router.post('/upload-multiple', 
  authenticate, 
  cleanupTempFiles,
  imageUpload.array('files', 10), 
  validateUploadedImages,
  uploadImageValidation, 
  mediaController.uploadMultipleImages
);

/**
 * @swagger
 * /api/media:
 *   get:
 *     summary: Liste des médias avec pagination et filtres
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [products, stores, users, general]
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [created_at, original_name, file_size, category]
 *           default: created_at
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Liste des médias
 */
router.get('/', 
  authenticate, 
  getMediasValidation, 
  mediaController.getMedias
);

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Détails d'un média spécifique
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du média
 *       404:
 *         description: Média non trouvé
 */
router.get('/:id', 
  authenticate, 
  mediaIdValidation, 
  mediaController.getMediaDetails
);

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Suppression d'un média
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Média supprimé avec succès
 *       404:
 *         description: Média non trouvé
 */
router.delete('/:id', 
  authenticate, 
  mediaIdValidation, 
  mediaController.deleteMedia
);

/**
 * @swagger
 * /api/media/{id}/signed-url:
 *   get:
 *     summary: Génération d'URL signée pour accès sécurisé
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: size
 *         in: query
 *         schema:
 *           type: string
 *           enum: [thumbnail, small, medium, large, original]
 *           default: medium
 *       - name: expiresIn
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 60
 *           maximum: 86400
 *           default: 3600
 *     responses:
 *       200:
 *         description: URL signée générée
 */
router.get('/:id/signed-url', 
  authenticate, 
  signedUrlValidation, 
  mediaController.getSignedUrl
);

/**
 * @swagger
 * /api/media/{id}/responsive:
 *   post:
 *     summary: Génération d'images responsive (WebP)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Images responsive générées
 *       404:
 *         description: Média non trouvé
 */
router.post('/:id/responsive', 
  authenticate, 
  mediaIdValidation, 
  mediaController.generateResponsiveImages
);

/**
 * @swagger
 * /api/media/optimize:
 *   post:
 *     summary: Optimisation des images existantes (maintenance)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Optimisation terminée
 */
router.post('/optimize', 
  authenticate, 
  mediaController.optimizeExistingImages
);

/**
 * @swagger
 * /api/media/stats:
 *   get:
 *     summary: Statistiques des médias
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques des médias
 */
router.get('/stats', 
  authenticate, 
  mediaController.getMediaStats
);

/**
 * @swagger
 * /api/media/cdn/usage-report:
 *   get:
 *     summary: Rapport d'utilisation du CDN
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *     responses:
 *       200:
 *         description: Rapport d'utilisation CDN
 */
router.get('/cdn/usage-report', 
  authenticate, 
  mediaController.getCdnUsageReport
);

/**
 * @swagger
 * /api/media/watermark/config:
 *   put:
 *     summary: Configuration du filigrane
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               position:
 *                 type: string
 *                 enum: [top-left, top-right, bottom-left, bottom-right, center]
 *               margin:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               opacity:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Configuration mise à jour
 */
router.put('/watermark/config', 
  authenticate, 
  watermarkConfigValidation, 
  mediaController.updateWatermarkConfig
);

// Routes administratives
/**
 * @swagger
 * /api/media/admin/dashboard:
 *   get:
 *     summary: Dashboard des statistiques médias
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard des statistiques
 */
router.get('/admin/dashboard', 
  authenticate, 
  mediaAdminController.getDashboard
);

/**
 * @swagger
 * /api/media/admin/health:
 *   get:
 *     summary: Vérification de santé du système de médias
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Système en bonne santé
 *       207:
 *         description: Système partiellement dégradé
 *       503:
 *         description: Système en erreur
 */
router.get('/admin/health', 
  authenticate, 
  mediaAdminController.getHealthCheck
);

/**
 * @swagger
 * /api/media/admin/tasks/{taskName}/run:
 *   post:
 *     summary: Exécution manuelle d'une tâche programmée
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: taskName
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [image_optimization, temp_cleanup, webp_generation, access_logs_cleanup, stuck_jobs_monitor]
 *     responses:
 *       200:
 *         description: Tâche exécutée avec succès
 */
router.post('/admin/tasks/:taskName/run', 
  authenticate, 
  param('taskName').isIn(['image_optimization', 'temp_cleanup', 'webp_generation', 'access_logs_cleanup', 'stuck_jobs_monitor']),
  mediaAdminController.runScheduledTask
);

/**
 * @swagger
 * /api/media/admin/config:
 *   get:
 *     summary: Configuration globale des médias
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration récupérée
 */
router.get('/admin/config', 
  authenticate, 
  mediaAdminController.getMediaConfig
);

/**
 * @swagger
 * /api/media/admin/config:
 *   put:
 *     summary: Mise à jour de la configuration globale
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               configKey:
 *                 type: string
 *                 enum: [watermark_config, image_optimization_settings, cdn_settings, upload_limits]
 *               configValue:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration mise à jour
 */
router.put('/admin/config', 
  authenticate,
  body('configKey').isIn(['watermark_config', 'image_optimization_settings', 'cdn_settings', 'upload_limits']),
  body('configValue').isObject(),
  mediaAdminController.updateMediaConfig
);

/**
 * @swagger
 * /api/media/admin/cleanup/orphaned:
 *   post:
 *     summary: Nettoyage des médias orphelins
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nettoyage terminé
 */
router.post('/admin/cleanup/orphaned', 
  authenticate, 
  mediaAdminController.cleanupOrphanedMedia
);

/**
 * @swagger
 * /api/media/admin/thumbnails/regenerate:
 *   post:
 *     summary: Regénération en masse des miniatures
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [products, stores, users, general]
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Regénération terminée
 */
router.post('/admin/thumbnails/regenerate', 
  authenticate,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['products', 'stores', 'users', 'general']),
  mediaAdminController.regenerateThumbnails
);

module.exports = router;