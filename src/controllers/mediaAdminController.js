const mediaScheduler = require('../services/mediaScheduler');
const mediaService = require('../services/mediaService');
const db = require('../config/database');
const { validationResult } = require('express-validator');

class MediaAdminController {
  /**
   * Dashboard des statistiques médias
   */
  async getDashboard(req, res) {
    try {
      // Statistiques générales
      const generalStats = await db('media_files')
        .select(
          db.raw('COUNT(*) as total_files'),
          db.raw('SUM(file_size) as total_size'),
          db.raw('AVG(file_size) as average_size'),
          db.raw('MAX(file_size) as max_size'),
          db.raw('MIN(file_size) as min_size')
        )
        .first();

      // Statistiques par catégorie
      const categoryStats = await db('media_files')
        .select('category', db.raw('COUNT(*) as count'), db.raw('SUM(file_size) as total_size'))
        .groupBy('category');

      // Statistiques des uploads récents (7 derniers jours)
      const recentStats = await db('media_files')
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as uploads')
        )
        .where('created_at', '>=', db.raw('NOW() - INTERVAL \'7 days\''))
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date');

      // Top des médias les plus accédés
      const topMedias = await db('media_access_logs')
        .join('media_files', 'media_access_logs.media_id', '=', 'media_files.id')
        .select(
          'media_files.id',
          'media_files.original_name',
          'media_files.category',
          db.raw('COUNT(*) as access_count')
        )
        .where('media_access_logs.accessed_at', '>=', db.raw('NOW() - INTERVAL \'30 days\''))
        .groupBy('media_files.id', 'media_files.original_name', 'media_files.category')
        .orderBy('access_count', 'desc')
        .limit(10);

      // Statut des tâches programmées
      const scheduledTasksStatus = await mediaScheduler.getScheduledTasksStatus();

      // Statistiques de stockage par taille d'image
      const sizeStats = await db('media_files')
        .select(
          db.raw(`
            SUM(CASE WHEN file_size < 100000 THEN 1 ELSE 0 END) as small_files,
            SUM(CASE WHEN file_size BETWEEN 100000 AND 1000000 THEN 1 ELSE 0 END) as medium_files,
            SUM(CASE WHEN file_size > 1000000 THEN 1 ELSE 0 END) as large_files
          `)
        )
        .first();

      res.json({
        success: true,
        data: {
          general: generalStats,
          byCategory: categoryStats,
          recentUploads: recentStats,
          topMedias,
          scheduledTasks: scheduledTasksStatus,
          sizeDistribution: sizeStats
        }
      });

    } catch (error) {
      console.error('Erreur dashboard médias:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Exécution manuelle d'une tâche programmée
   */
  async runScheduledTask(req, res) {
    try {
      const { taskName } = req.params;
      
      const validTasks = [
        'image_optimization',
        'temp_cleanup', 
        'webp_generation',
        'access_logs_cleanup',
        'stuck_jobs_monitor'
      ];

      if (!validTasks.includes(taskName)) {
        return res.status(400).json({
          success: false,
          message: `Tâche invalide. Tâches disponibles: ${validTasks.join(', ')}`
        });
      }

      const result = await mediaScheduler.runTask(taskName);

      res.json({
        success: true,
        message: result.message,
        data: result
      });

    } catch (error) {
      console.error('Erreur exécution tâche programmée:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'exécution de la tâche',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Configuration globale des médias
   */
  async getMediaConfig(req, res) {
    try {
      const config = await db('system_config')
        .whereIn('key', [
          'watermark_config',
          'image_optimization_settings',
          'cdn_settings',
          'upload_limits'
        ]);

      const configData = {};
      config.forEach(item => {
        configData[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
      });

      res.json({
        success: true,
        data: configData
      });

    } catch (error) {
      console.error('Erreur récupération config médias:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mise à jour de la configuration globale
   */
  async updateMediaConfig(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Erreurs de validation',
          errors: errors.array()
        });
      }

      const { configKey, configValue } = req.body;

      const validConfigKeys = [
        'watermark_config',
        'image_optimization_settings', 
        'cdn_settings',
        'upload_limits'
      ];

      if (!validConfigKeys.includes(configKey)) {
        return res.status(400).json({
          success: false,
          message: `Clé de configuration invalide. Clés autorisées: ${validConfigKeys.join(', ')}`
        });
      }

      await db('system_config')
        .insert({
          key: configKey,
          value: JSON.stringify(configValue),
          updated_at: new Date()
        })
        .onConflict('key')
        .merge();

      res.json({
        success: true,
        message: 'Configuration mise à jour avec succès',
        data: { configKey, configValue }
      });

    } catch (error) {
      console.error('Erreur mise à jour config médias:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Nettoyage des médias orphelins
   */
  async cleanupOrphanedMedia(req, res) {
    try {
      // Trouver les médias non référencés dans les autres tables
      const orphanedMedia = await db('media_files')
        .leftJoin('products', function() {
          this.on(db.raw('media_files.id = ANY(STRING_TO_ARRAY(products.images, \',\'))'));
        })
        .leftJoin('stores', function() {
          this.on(db.raw('media_files.id = ANY(STRING_TO_ARRAY(stores.images, \',\'))'));
        })
        .leftJoin('users', 'users.avatar', '=', 'media_files.id')
        .select('media_files.*')
        .whereNull('products.id')
        .andWhereNull('stores.id')
        .andWhereNull('users.id')
        .andWhere('media_files.created_at', '<', db.raw('NOW() - INTERVAL \'7 days\''));

      let deletedCount = 0;
      const errors = [];

      for (const media of orphanedMedia) {
        try {
          await mediaService.deleteMedia(media.id);
          deletedCount++;
        } catch (error) {
          console.error(`Erreur suppression média orphelin ${media.id}:`, error);
          errors.push({ mediaId: media.id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `Nettoyage terminé: ${deletedCount} médias orphelins supprimés`,
        data: {
          deletedCount,
          totalOrphaned: orphanedMedia.length,
          errors
        }
      });

    } catch (error) {
      console.error('Erreur nettoyage médias orphelins:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du nettoyage',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Analyse de la santé du système de médias
   */
  async getHealthCheck(req, res) {
    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {}
      };

      // Vérifier la connectivité S3
      try {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION
        });
        
        await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
        healthData.checks.s3_connectivity = 'healthy';
      } catch (error) {
        healthData.checks.s3_connectivity = 'unhealthy';
        healthData.checks.s3_error = error.message;
        healthData.status = 'degraded';
      }

      // Vérifier l'espace disque temporaire
      try {
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(__dirname, '../../uploads/temp');
        const stats = fs.statSync(tempDir);
        
        healthData.checks.temp_directory = 'healthy';
        healthData.checks.temp_directory_size = stats.size;
      } catch (error) {
        healthData.checks.temp_directory = 'unhealthy';
        healthData.checks.temp_directory_error = error.message;
        healthData.status = 'degraded';
      }

      // Vérifier les jobs de traitement bloqués
      const stuckJobs = await db('media_processing_jobs')
        .where('status', 'processing')
        .where('started_at', '<', db.raw('NOW() - INTERVAL \'2 hours\''))
        .count('* as count')
        .first();

      healthData.checks.stuck_jobs = {
        status: stuckJobs.count > 0 ? 'warning' : 'healthy',
        count: parseInt(stuckJobs.count)
      };

      if (stuckJobs.count > 0 && healthData.status === 'healthy') {
        healthData.status = 'degraded';
      }

      // Vérifier la performance des tâches récentes
      const recentTasksStatus = await mediaScheduler.getScheduledTasksStatus();
      const failedTasks = Object.values(recentTasksStatus).filter(task => task.status === 'error');
      
      healthData.checks.scheduled_tasks = {
        status: failedTasks.length === 0 ? 'healthy' : 'warning',
        failed_tasks: failedTasks.length,
        total_tasks: Object.keys(recentTasksStatus).length
      };

      if (failedTasks.length > 0 && healthData.status === 'healthy') {
        healthData.status = 'degraded';
      }

      const statusCode = healthData.status === 'healthy' ? 200 : 207;

      res.status(statusCode).json({
        success: healthData.status !== 'unhealthy',
        data: healthData
      });

    } catch (error) {
      console.error('Erreur health check médias:', error);
      res.status(503).json({
        success: false,
        message: 'Erreur lors du health check',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Regénération en masse des miniatures
   */
  async regenerateThumbnails(req, res) {
    try {
      const { category, limit = 50 } = req.query;

      let query = db('media_files').select('id');
      
      if (category) {
        query = query.where('category', category);
      }

      const medias = await query.limit(parseInt(limit));

      const results = [];
      
      for (const media of medias) {
        try {
          const webpVariants = await mediaService.generateResponsiveImages(media.id);
          results.push({
            mediaId: media.id,
            status: 'success',
            generatedVariants: Object.keys(webpVariants).length
          });
        } catch (error) {
          console.error(`Erreur regénération miniatures ${media.id}:`, error);
          results.push({
            mediaId: media.id,
            status: 'error',
            error: error.message
          });
        }
      }

      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      };

      res.json({
        success: true,
        message: `Regénération terminée: ${summary.successful}/${summary.total} réussies`,
        data: { summary, results }
      });

    } catch (error) {
      console.error('Erreur regénération miniatures:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new MediaAdminController();