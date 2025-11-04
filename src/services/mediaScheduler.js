const cron = require('node-cron');
const mediaService = require('../services/mediaService');
const db = require('../config/database');

class MediaScheduler {
  constructor() {
    this.initSchedules();
  }

  /**
   * Initialise les tâches programmées
   */
  initSchedules() {
    // Optimisation des images non optimisées - tous les jours à 2h du matin
    cron.schedule('0 2 * * *', async () => {
      console.log('Début de l\'optimisation automatique des images...');
      await this.runImageOptimization();
    });

    // Nettoyage des fichiers temporaires - tous les jours à 3h du matin
    cron.schedule('0 3 * * *', async () => {
      console.log('Début du nettoyage des fichiers temporaires...');
      await this.cleanupTempFiles();
    });

    // Génération des images WebP manquantes - tous les dimanches à 1h du matin
    cron.schedule('0 1 * * 0', async () => {
      console.log('Début de la génération des images WebP...');
      await this.generateMissingWebPImages();
    });

    // Nettoyage des logs d'accès anciens - tous les mois le 1er à 4h du matin
    cron.schedule('0 4 1 * *', async () => {
      console.log('Début du nettoyage des logs d\'accès...');
      await this.cleanupOldAccessLogs();
    });

    // Monitoring des jobs de traitement bloqués - toutes les heures
    cron.schedule('0 * * * *', async () => {
      await this.monitorStuckJobs();
    });

    console.log('Planificateur de médias initialisé avec succès');
  }

  /**
   * Optimisation automatique des images
   */
  async runImageOptimization() {
    try {
      const results = await mediaService.optimizeExistingImages();
      
      const summary = {
        total: results.length,
        optimized: results.filter(r => r.status === 'optimized').length,
        errors: results.filter(r => r.status === 'error').length
      };

      console.log(`Optimisation terminée: ${summary.optimized}/${summary.total} images optimisées`);
      
      // Enregistrer les statistiques
      await this.logScheduledTaskResult('image_optimization', summary);
      
    } catch (error) {
      console.error('Erreur lors de l\'optimisation automatique:', error);
      await this.logScheduledTaskError('image_optimization', error);
    }
  }

  /**
   * Nettoyage des fichiers temporaires
   */
  async cleanupTempFiles() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const tempDir = path.join(__dirname, '../../uploads/temp');
      const files = await fs.readdir(tempDir);
      
      let deletedCount = 0;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Impossible de supprimer le fichier temporaire ${file}:`, error);
        }
      }
      
      console.log(`Nettoyage terminé: ${deletedCount} fichiers temporaires supprimés`);
      
      await this.logScheduledTaskResult('temp_cleanup', { deletedCount });
      
    } catch (error) {
      console.error('Erreur lors du nettoyage des fichiers temporaires:', error);
      await this.logScheduledTaskError('temp_cleanup', error);
    }
  }

  /**
   * Génération des images WebP manquantes
   */
  async generateMissingWebPImages() {
    try {
      // Trouver les médias sans variants WebP
      const mediasWithoutWebP = await db('media_files')
        .select('id', 'variants')
        .whereRaw("variants::text NOT LIKE '%_webp%'")
        .limit(100); // Limiter pour éviter la surcharge

      let generatedCount = 0;
      let errorCount = 0;

      for (const media of mediasWithoutWebP) {
        try {
          await mediaService.generateResponsiveImages(media.id);
          generatedCount++;
        } catch (error) {
          console.error(`Erreur génération WebP pour média ${media.id}:`, error);
          errorCount++;
        }
      }

      console.log(`Génération WebP terminée: ${generatedCount} médias traités, ${errorCount} erreurs`);
      
      await this.logScheduledTaskResult('webp_generation', { 
        generatedCount, 
        errorCount, 
        totalProcessed: mediasWithoutWebP.length 
      });
      
    } catch (error) {
      console.error('Erreur lors de la génération des images WebP:', error);
      await this.logScheduledTaskError('webp_generation', error);
    }
  }

  /**
   * Nettoyage des anciens logs d'accès
   */
  async cleanupOldAccessLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Garder 6 mois de logs

      const deletedCount = await db('media_access_logs')
        .where('accessed_at', '<', cutoffDate)
        .del();

      console.log(`Nettoyage des logs terminé: ${deletedCount} entrées supprimées`);
      
      await this.logScheduledTaskResult('access_logs_cleanup', { deletedCount });
      
    } catch (error) {
      console.error('Erreur lors du nettoyage des logs d\'accès:', error);
      await this.logScheduledTaskError('access_logs_cleanup', error);
    }
  }

  /**
   * Monitoring des jobs de traitement bloqués
   */
  async monitorStuckJobs() {
    try {
      const stuckThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 heures
      
      // Trouver les jobs bloqués
      const stuckJobs = await db('media_processing_jobs')
        .where('status', 'processing')
        .where('started_at', '<', stuckThreshold);

      if (stuckJobs.length > 0) {
        console.warn(`${stuckJobs.length} jobs de traitement semblent bloqués`);
        
        // Marquer les jobs comme échoués
        await db('media_processing_jobs')
          .whereIn('id', stuckJobs.map(job => job.id))
          .update({
            status: 'failed',
            error_message: 'Job timeout - marqué comme échoué par le moniteur',
            completed_at: new Date(),
            updated_at: new Date()
          });

        await this.logScheduledTaskResult('stuck_jobs_monitor', { 
          stuckJobsFound: stuckJobs.length,
          markedAsFailed: stuckJobs.length
        });
      }
      
    } catch (error) {
      console.error('Erreur lors du monitoring des jobs bloqués:', error);
      await this.logScheduledTaskError('stuck_jobs_monitor', error);
    }
  }

  /**
   * Enregistre le résultat d'une tâche programmée
   */
  async logScheduledTaskResult(taskName, result) {
    try {
      await db('system_config')
        .insert({
          key: `scheduled_task_${taskName}_last_run`,
          value: JSON.stringify({
            timestamp: new Date(),
            result,
            status: 'success'
          }),
          description: `Dernière exécution de la tâche programmée: ${taskName}`
        })
        .onConflict('key')
        .merge();
    } catch (error) {
      console.error('Erreur enregistrement résultat tâche programmée:', error);
    }
  }

  /**
   * Enregistre l'erreur d'une tâche programmée
   */
  async logScheduledTaskError(taskName, error) {
    try {
      await db('system_config')
        .insert({
          key: `scheduled_task_${taskName}_last_run`,
          value: JSON.stringify({
            timestamp: new Date(),
            error: error.message,
            stack: error.stack,
            status: 'error'
          }),
          description: `Dernière exécution de la tâche programmée: ${taskName}`
        })
        .onConflict('key')
        .merge();
    } catch (logError) {
      console.error('Erreur enregistrement erreur tâche programmée:', logError);
    }
  }

  /**
   * Obtient le statut des dernières exécutions
   */
  async getScheduledTasksStatus() {
    try {
      const tasks = await db('system_config')
        .select('key', 'value', 'updated_at')
        .where('key', 'like', 'scheduled_task_%_last_run');

      const status = {};
      
      for (const task of tasks) {
        const taskName = task.key.replace('scheduled_task_', '').replace('_last_run', '');
        const taskData = typeof task.value === 'string' ? JSON.parse(task.value) : task.value;
        
        status[taskName] = {
          lastRun: taskData.timestamp,
          status: taskData.status,
          result: taskData.result || null,
          error: taskData.error || null,
          updatedAt: task.updated_at
        };
      }
      
      return status;
      
    } catch (error) {
      console.error('Erreur récupération statut tâches programmées:', error);
      throw error;
    }
  }

  /**
   * Force l'exécution d'une tâche spécifique
   */
  async runTask(taskName) {
    try {
      switch (taskName) {
        case 'image_optimization':
          await this.runImageOptimization();
          break;
        case 'temp_cleanup':
          await this.cleanupTempFiles();
          break;
        case 'webp_generation':
          await this.generateMissingWebPImages();
          break;
        case 'access_logs_cleanup':
          await this.cleanupOldAccessLogs();
          break;
        case 'stuck_jobs_monitor':
          await this.monitorStuckJobs();
          break;
        default:
          throw new Error(`Tâche inconnue: ${taskName}`);
      }
      
      return { success: true, message: `Tâche ${taskName} exécutée avec succès` };
      
    } catch (error) {
      console.error(`Erreur exécution forcée de la tâche ${taskName}:`, error);
      throw error;
    }
  }
}

module.exports = new MediaScheduler();