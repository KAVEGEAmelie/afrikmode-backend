const sharp = require('sharp');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Configuration AWS S3/CloudFront CDN
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-3'
});

// Configuration des tailles d'images
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
  original: null // Taille originale
};

// Configuration du filigrane
const WATERMARK_CONFIG = {
  position: 'bottom-right',
  margin: 20,
  opacity: 0.7
};

class MediaService {
  /**
   * Traite et upload une image avec toutes les tailles
   */
  async processAndUploadImage(filePath, category = 'general', options = {}) {
    try {
      const results = {};
      const fileId = uuidv4();
      const originalBuffer = await fs.readFile(filePath);
      
      // Obtenir les métadonnées de l'image originale
      const metadata = await sharp(originalBuffer).metadata();
      
      // Traiter chaque taille
      for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
        let processedBuffer = originalBuffer;
        
        if (dimensions) {
          // Redimensionner l'image
          processedBuffer = await sharp(originalBuffer)
            .resize(dimensions.width, dimensions.height, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();
        } else {
          // Optimiser l'image originale
          processedBuffer = await sharp(originalBuffer)
            .jpeg({ quality: 90, progressive: true })
            .toBuffer();
        }
        
        // Ajouter le filigrane si demandé
        if (options.watermark && sizeName !== 'thumbnail') {
          processedBuffer = await this.addWatermark(processedBuffer, options.watermarkPath);
        }
        
        // Upload vers S3/CDN
        const s3Key = `${category}/${fileId}/${sizeName}.jpg`;
        const uploadResult = await this.uploadToS3(processedBuffer, s3Key, 'image/jpeg');
        
        results[sizeName] = {
          url: uploadResult.Location,
          cdnUrl: this.getCdnUrl(s3Key),
          key: s3Key,
          size: processedBuffer.length
        };
      }
      
      // Enregistrer en base de données
      const mediaRecord = await this.saveMediaRecord({
        id: fileId,
        category,
        original_name: path.basename(filePath),
        mime_type: 'image/jpeg',
        file_size: originalBuffer.length,
        width: metadata.width,
        height: metadata.height,
        variants: results,
        metadata: {
          format: metadata.format,
          channels: metadata.channels,
          density: metadata.density
        }
      });
      
      return {
        id: fileId,
        variants: results,
        metadata: mediaRecord
      };
      
    } catch (error) {
      console.error('Erreur traitement image:', error);
      throw error;
    }
  }
  
  /**
   * Ajoute un filigrane à une image
   */
  async addWatermark(imageBuffer, watermarkPath) {
    try {
      if (!watermarkPath || !await this.fileExists(watermarkPath)) {
        return imageBuffer; // Pas de filigrane si le fichier n'existe pas
      }
      
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      // Préparer le filigrane
      const watermark = await sharp(watermarkPath)
        .resize(Math.floor(width * 0.2), Math.floor(height * 0.2), {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png()
        .toBuffer();
      
      // Calculer la position du filigrane
      const position = this.calculateWatermarkPosition(width, height, watermark);
      
      // Appliquer le filigrane
      return await image
        .composite([{
          input: watermark,
          gravity: WATERMARK_CONFIG.position,
          blend: 'over'
        }])
        .toBuffer();
        
    } catch (error) {
      console.error('Erreur ajout filigrane:', error);
      return imageBuffer; // Retourner l'image sans filigrane en cas d'erreur
    }
  }
  
  /**
   * Upload vers S3
   */
  async uploadToS3(buffer, key, contentType) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000', // 1 an de cache
      Metadata: {
        'uploaded-by': 'afrikmode-media-service',
        'uploaded-at': new Date().toISOString()
      }
    };
    
    return await s3.upload(params).promise();
  }
  
  /**
   * Obtient l'URL CDN CloudFront
   */
  getCdnUrl(s3Key) {
    const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    return cdnDomain ? `https://${cdnDomain}/${s3Key}` : null;
  }
  
  /**
   * Compression automatique des images uploadées
   */
  async compressImage(filePath, quality = 85) {
    try {
      const outputPath = filePath.replace(/\.[^/.]+$/, '_compressed.jpg');
      
      await sharp(filePath)
        .jpeg({ 
          quality, 
          progressive: true,
          mozjpeg: true 
        })
        .toFile(outputPath);
        
      return outputPath;
    } catch (error) {
      console.error('Erreur compression image:', error);
      throw error;
    }
  }
  
  /**
   * Génère des URLs signées pour l'accès sécurisé
   */
  async getSignedUrl(s3Key, expiresIn = 3600) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Expires: expiresIn
    };
    
    return s3.getSignedUrl('getObject', params);
  }
  
  /**
   * Supprime un média et toutes ses variantes
   */
  async deleteMedia(mediaId) {
    try {
      // Récupérer les informations du média
      const media = await db('media_files').where('id', mediaId).first();
      
      if (!media) {
        throw new Error('Média non trouvé');
      }
      
      // Supprimer tous les fichiers S3
      const variants = media.variants || {};
      const deletePromises = Object.values(variants).map(variant => {
        if (variant.key) {
          return s3.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: variant.key
          }).promise();
        }
      });
      
      await Promise.all(deletePromises);
      
      // Supprimer de la base de données
      await db('media_files').where('id', mediaId).del();
      
      return { success: true, message: 'Média supprimé avec succès' };
      
    } catch (error) {
      console.error('Erreur suppression média:', error);
      throw error;
    }
  }
  
  /**
   * Optimise les images existantes (tâche de maintenance)
   */
  async optimizeExistingImages() {
    try {
      const medias = await db('media_files')
        .where('optimized', false)
        .orWhereNull('optimized')
        .limit(50);
      
      const results = [];
      
      for (const media of medias) {
        try {
          // Re-traiter l'image avec les nouveaux paramètres d'optimisation
          const variants = media.variants || {};
          const optimizedVariants = {};
          
          for (const [sizeName, variant] of Object.entries(variants)) {
            if (variant.key) {
              // Télécharger depuis S3
              const s3Object = await s3.getObject({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: variant.key
              }).promise();
              
              // Optimiser
              const optimizedBuffer = await sharp(s3Object.Body)
                .jpeg({ quality: 85, progressive: true, mozjpeg: true })
                .toBuffer();
              
              // Re-upload optimisé
              await this.uploadToS3(optimizedBuffer, variant.key, 'image/jpeg');
              
              optimizedVariants[sizeName] = {
                ...variant,
                size: optimizedBuffer.length,
                optimized: true
              };
            }
          }
          
          // Mettre à jour en base
          await db('media_files')
            .where('id', media.id)
            .update({
              variants: JSON.stringify(optimizedVariants),
              optimized: true,
              updated_at: new Date()
            });
          
          results.push({
            id: media.id,
            status: 'optimized',
            originalSize: media.file_size,
            newSize: Object.values(optimizedVariants).reduce((sum, v) => sum + (v.size || 0), 0)
          });
          
        } catch (error) {
          console.error(`Erreur optimisation média ${media.id}:`, error);
          results.push({
            id: media.id,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Erreur optimisation batch:', error);
      throw error;
    }
  }
  
  /**
   * Génère des images responsive automatiquement
   */
  async generateResponsiveImages(mediaId) {
    try {
      const media = await db('media_files').where('id', mediaId).first();
      
      if (!media || !media.variants.original) {
        throw new Error('Image originale non trouvée');
      }
      
      // Télécharger l'image originale
      const s3Object = await s3.getObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: media.variants.original.key
      }).promise();
      
      // Générer les images WebP pour de meilleures performances
      const webpVariants = {};
      
      for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
        if (sizeName === 'original') continue;
        
        const webpBuffer = await sharp(s3Object.Body)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toBuffer();
        
        const webpKey = `${media.category}/${media.id}/${sizeName}.webp`;
        const uploadResult = await this.uploadToS3(webpBuffer, webpKey, 'image/webp');
        
        webpVariants[`${sizeName}_webp`] = {
          url: uploadResult.Location,
          cdnUrl: this.getCdnUrl(webpKey),
          key: webpKey,
          size: webpBuffer.length,
          format: 'webp'
        };
      }
      
      // Mettre à jour les variants
      const updatedVariants = { ...media.variants, ...webpVariants };
      
      await db('media_files')
        .where('id', mediaId)
        .update({
          variants: JSON.stringify(updatedVariants),
          updated_at: new Date()
        });
      
      return webpVariants;
      
    } catch (error) {
      console.error('Erreur génération images responsive:', error);
      throw error;
    }
  }
  
  /**
   * Analyse et rapport d'utilisation du CDN
   */
  async getCdnUsageReport(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      // Statistiques des médias
      const mediaStats = await db('media_files')
        .select(
          db.raw('COUNT(*) as total_files'),
          db.raw('SUM(file_size) as total_size'),
          db.raw('AVG(file_size) as avg_size'),
          'category'
        )
        .where('created_at', '>=', startDate)
        .groupBy('category');
      
      // Top médias les plus accédés (si nous avons des logs d'accès)
      const topMedias = await db('media_access_logs')
        .select('media_id', db.raw('COUNT(*) as access_count'))
        .where('accessed_at', '>=', startDate)
        .groupBy('media_id')
        .orderBy('access_count', 'desc')
        .limit(10);
      
      return {
        period: { start: startDate, end: endDate },
        statistics: mediaStats,
        topMedias,
        summary: {
          totalFiles: mediaStats.reduce((sum, stat) => sum + parseInt(stat.total_files), 0),
          totalSize: mediaStats.reduce((sum, stat) => sum + parseInt(stat.total_size), 0),
          averageSize: mediaStats.reduce((sum, stat) => sum + parseFloat(stat.avg_size), 0) / mediaStats.length
        }
      };
      
    } catch (error) {
      console.error('Erreur rapport CDN:', error);
      throw error;
    }
  }
  
  // Méthodes utilitaires
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  calculateWatermarkPosition(imageWidth, imageHeight, watermarkBuffer) {
    // Calculer la position basée sur la configuration
    const margin = WATERMARK_CONFIG.margin;
    
    switch (WATERMARK_CONFIG.position) {
      case 'bottom-right':
        return { top: imageHeight - margin, left: imageWidth - margin };
      case 'bottom-left':
        return { top: imageHeight - margin, left: margin };
      case 'top-right':
        return { top: margin, left: imageWidth - margin };
      case 'top-left':
        return { top: margin, left: margin };
      case 'center':
        return { top: imageHeight / 2, left: imageWidth / 2 };
      default:
        return { top: imageHeight - margin, left: imageWidth - margin };
    }
  }
  
  async saveMediaRecord(data) {
    const record = {
      id: data.id,
      category: data.category,
      original_name: data.original_name,
      mime_type: data.mime_type,
      file_size: data.file_size,
      width: data.width,
      height: data.height,
      variants: JSON.stringify(data.variants),
      metadata: JSON.stringify(data.metadata),
      optimized: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    return await db('media_files').insert(record).returning('*');
  }
}

module.exports = new MediaService();