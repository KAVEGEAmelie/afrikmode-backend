const mediaService = require('../services/mediaService');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

class MediaController {
  /**
   * Upload et traitement d'image
   */
  async uploadImage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Erreurs de validation',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const { category = 'general', addWatermark = false } = req.body;
      
      // Options de traitement
      const options = {
        watermark: addWatermark === 'true',
        watermarkPath: process.env.WATERMARK_PATH || path.join(__dirname, '../../assets/watermark.png')
      };

      // Traitement de l'image
      const result = await mediaService.processAndUploadImage(
        req.file.path,
        category,
        options
      );

      // Nettoyer le fichier temporaire
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Impossible de supprimer le fichier temporaire:', error);
      }

      res.status(201).json({
        success: true,
        message: 'Image uploadée et traitée avec succès',
        data: result
      });

    } catch (error) {
      console.error('Erreur upload image:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Upload multiple d'images
   */
  async uploadMultipleImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const { category = 'general', addWatermark = false } = req.body;
      const results = [];
      
      // Options de traitement
      const options = {
        watermark: addWatermark === 'true',
        watermarkPath: process.env.WATERMARK_PATH || path.join(__dirname, '../../assets/watermark.png')
      };

      // Traitement de chaque image
      for (const file of req.files) {
        try {
          const result = await mediaService.processAndUploadImage(
            file.path,
            category,
            options
          );
          results.push({ 
            filename: file.originalname, 
            success: true, 
            data: result 
          });

          // Nettoyer le fichier temporaire
          try {
            await fs.unlink(file.path);
          } catch (error) {
            console.warn('Impossible de supprimer le fichier temporaire:', error);
          }

        } catch (error) {
          console.error(`Erreur traitement ${file.originalname}:`, error);
          results.push({ 
            filename: file.originalname, 
            success: false, 
            error: error.message 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      res.status(successCount > 0 ? 201 : 400).json({
        success: successCount > 0,
        message: `${successCount}/${totalCount} images traitées avec succès`,
        data: results
      });

    } catch (error) {
      console.error('Erreur upload multiple:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Liste des médias avec pagination et filtres
   */
  async getMedias(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const offset = (page - 1) * limit;
      
      let query = db('media_files').select('*');

      // Filtres
      if (category) {
        query = query.where('category', category);
      }

      if (search) {
        query = query.where('original_name', 'ilike', `%${search}%`);
      }

      // Tri
      const validSortFields = ['created_at', 'original_name', 'file_size', 'category'];
      const validSortOrders = ['asc', 'desc'];
      
      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toLowerCase())) {
        query = query.orderBy(sortBy, sortOrder.toLowerCase());
      }

      // Pagination
      const totalQuery = query.clone();
      const total = await totalQuery.count('* as count').first();
      const medias = await query.limit(limit).offset(offset);

      // Ajouter les URLs CDN si disponibles
      const mediasWithCdn = medias.map(media => ({
        ...media,
        variants: typeof media.variants === 'string' ? JSON.parse(media.variants) : media.variants,
        metadata: typeof media.metadata === 'string' ? JSON.parse(media.metadata) : media.metadata
      }));

      res.json({
        success: true,
        data: {
          medias: mediasWithCdn,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total.count),
            totalPages: Math.ceil(total.count / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération médias:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Détails d'un média spécifique
   */
  async getMediaDetails(req, res) {
    try {
      const { id } = req.params;

      const media = await db('media_files').where('id', id).first();

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Média non trouvé'
        });
      }

      // Parser les JSON fields
      const mediaDetails = {
        ...media,
        variants: typeof media.variants === 'string' ? JSON.parse(media.variants) : media.variants,
        metadata: typeof media.metadata === 'string' ? JSON.parse(media.metadata) : media.metadata
      };

      res.json({
        success: true,
        data: mediaDetails
      });

    } catch (error) {
      console.error('Erreur détails média:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Suppression d'un média
   */
  async deleteMedia(req, res) {
    try {
      const { id } = req.params;

      const result = await mediaService.deleteMedia(id);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erreur suppression média:', error);
      
      if (error.message === 'Média non trouvé') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Génération d'URL signée pour accès sécurisé
   */
  async getSignedUrl(req, res) {
    try {
      const { id } = req.params;
      const { size = 'medium', expiresIn = 3600 } = req.query;

      const media = await db('media_files').where('id', id).first();

      if (!media) {
        return res.status(404).json({
          success: false,
          message: 'Média non trouvé'
        });
      }

      const variants = typeof media.variants === 'string' ? JSON.parse(media.variants) : media.variants;
      const variant = variants[size];

      if (!variant || !variant.key) {
        return res.status(404).json({
          success: false,
          message: `Taille ${size} non disponible pour ce média`
        });
      }

      const signedUrl = await mediaService.getSignedUrl(variant.key, parseInt(expiresIn));

      res.json({
        success: true,
        data: {
          signedUrl,
          expiresIn: parseInt(expiresIn),
          expiresAt: new Date(Date.now() + parseInt(expiresIn) * 1000)
        }
      });

    } catch (error) {
      console.error('Erreur génération URL signée:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Optimisation des images existantes (tâche de maintenance)
   */
  async optimizeExistingImages(req, res) {
    try {
      const results = await mediaService.optimizeExistingImages();

      const summary = {
        total: results.length,
        optimized: results.filter(r => r.status === 'optimized').length,
        errors: results.filter(r => r.status === 'error').length
      };

      res.json({
        success: true,
        message: 'Optimisation des images terminée',
        data: {
          summary,
          details: results
        }
      });

    } catch (error) {
      console.error('Erreur optimisation images:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Génération d'images responsive (WebP)
   */
  async generateResponsiveImages(req, res) {
    try {
      const { id } = req.params;

      const webpVariants = await mediaService.generateResponsiveImages(id);

      res.json({
        success: true,
        message: 'Images responsive générées avec succès',
        data: webpVariants
      });

    } catch (error) {
      console.error('Erreur génération images responsive:', error);
      
      if (error.message === 'Image originale non trouvée') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Rapport d'utilisation du CDN
   */
  async getCdnUsageReport(req, res) {
    try {
      const { days = 30 } = req.query;

      const report = await mediaService.getCdnUsageReport(parseInt(days));

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Erreur rapport CDN:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Configuration du filigrane
   */
  async updateWatermarkConfig(req, res) {
    try {
      const { position, margin, opacity } = req.body;

      // Validation des valeurs
      const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
      
      if (position && !validPositions.includes(position)) {
        return res.status(400).json({
          success: false,
          message: 'Position de filigrane invalide'
        });
      }

      // Sauvegarder la configuration (vous pouvez utiliser une table de configuration)
      const config = {
        position: position || 'bottom-right',
        margin: margin || 20,
        opacity: opacity || 0.7,
        updated_at: new Date()
      };

      // Exemple de sauvegarde (adaptez selon votre structure)
      await db('system_config')
        .where('key', 'watermark_config')
        .update({ value: JSON.stringify(config) })
        .orInsert({
          key: 'watermark_config',
          value: JSON.stringify(config),
          created_at: new Date(),
          updated_at: new Date()
        });

      res.json({
        success: true,
        message: 'Configuration du filigrane mise à jour',
        data: config
      });

    } catch (error) {
      console.error('Erreur mise à jour config filigrane:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Statistiques des médias
   */
  async getMediaStats(req, res) {
    try {
      const stats = await db('media_files')
        .select(
          db.raw('COUNT(*) as total_files'),
          db.raw('SUM(file_size) as total_size'),
          db.raw('AVG(file_size) as average_size'),
          'category'
        )
        .groupBy('category');

      const overallStats = await db('media_files')
        .select(
          db.raw('COUNT(*) as total_files'),
          db.raw('SUM(file_size) as total_size'),
          db.raw('AVG(file_size) as average_size'),
          db.raw('MAX(file_size) as max_size'),
          db.raw('MIN(file_size) as min_size')
        )
        .first();

      // Statistiques par format
      const formatStats = await db('media_files')
        .select('mime_type', db.raw('COUNT(*) as count'))
        .groupBy('mime_type');

      res.json({
        success: true,
        data: {
          overall: overallStats,
          byCategory: stats,
          byFormat: formatStats
        }
      });

    } catch (error) {
      console.error('Erreur statistiques médias:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new MediaController();