const seoService = require('../services/seoService');
// const { validateRequest } = require('../middleware/validation');
const { query } = require('express-validator');

/**
 * Contrôleur pour les fonctionnalités SEO
 */
class SeoController {

  /**
   * Génère le sitemap XML
   */
  async generateSitemap(req, res) {
    try {
      const result = await seoService.generateSitemap();
      
      res.json({
        success: true,
        message: 'Sitemap généré avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur génération sitemap:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du sitemap'
      });
    }
  }

  /**
   * Génère le fichier robots.txt
   */
  async generateRobotsTxt(req, res) {
    try {
      const result = await seoService.generateRobotsTxt();
      
      res.json({
        success: true,
        message: 'Robots.txt généré avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur génération robots.txt:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du robots.txt'
      });
    }
  }

  /**
   * Génère les métadonnées Schema.org pour un produit
   */
  async getProductSchema(req, res) {
    try {
      const { productId } = req.params;
      
      // Récupérer les informations du produit
      const db = require('../config/database');
      const product = await db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('stores', 'products.store_id', 'stores.id')
        .where('products.id', productId)
        .select(
          'products.*',
          'categories.name as category_name',
          'stores.name as store_name',
          'stores.description as store_description',
          'stores.logo_url as store_logo'
        )
        .first();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      // Récupérer les avis
      const reviews = await db('reviews')
        .leftJoin('users', 'reviews.user_id', 'users.id')
        .where('product_id', productId)
        .where('is_approved', true)
        .select(
          'reviews.*',
          'users.first_name as user_name'
        )
        .limit(10);

      const store = product.store_name ? {
        name: product.store_name,
        description: product.store_description,
        logo_url: product.store_logo
      } : null;

      const schema = seoService.generateProductSchema(product, store, reviews);
      
      res.json({
        success: true,
        data: {
          product_id: productId,
          schema: schema
        }
      });
    } catch (error) {
      console.error('Erreur génération schema produit:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du schema'
      });
    }
  }

  /**
   * Génère les métadonnées Schema.org pour une boutique
   */
  async getStoreSchema(req, res) {
    try {
      const { storeId } = req.params;
      
      const db = require('../config/database');
      const store = await db('stores')
        .where('id', storeId)
        .first();

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Boutique non trouvée'
        });
      }

      const schema = seoService.generateStoreSchema(store);
      
      res.json({
        success: true,
        data: {
          store_id: storeId,
          schema: schema
        }
      });
    } catch (error) {
      console.error('Erreur génération schema boutique:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du schema'
      });
    }
  }

  /**
   * Récupère les métadonnées Schema.org de l'organisation
   */
  async getOrganizationSchema(req, res) {
    try {
      const schema = seoService.generateOrganizationSchema();
      
      res.json({
        success: true,
        data: {
          schema: schema
        }
      });
    } catch (error) {
      console.error('Erreur génération schema organisation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du schema'
      });
    }
  }

  /**
   * Récupère les métadonnées Schema.org pour la recherche
   */
  async getSearchSchema(req, res) {
    try {
      const schema = seoService.generateSearchSchema();
      
      res.json({
        success: true,
        data: {
          schema: schema
        }
      });
    } catch (error) {
      console.error('Erreur génération schema recherche:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du schema'
      });
    }
  }

  /**
   * Génère une URL canonique
   */
  async getCanonicalUrl(req, res) {
    try {
      const { path } = req.query;
      const params = { ...req.query };
      delete params.path;
      
      const canonicalUtils = seoService.generateCanonicalUrls();
      const canonicalUrl = canonicalUtils.getCanonicalUrl(path || req.originalUrl, params);
      
      res.json({
        success: true,
        data: {
          canonical_url: canonicalUrl,
          original_path: path || req.originalUrl
        }
      });
    } catch (error) {
      console.error('Erreur génération URL canonique:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération de l\'URL canonique'
      });
    }
  }

  /**
   * Génère les métadonnées Open Graph pour un produit
   */
  async getOpenGraphMeta(req, res) {
    try {
      const { productId } = req.params;
      
      const db = require('../config/database');
      const product = await db('products')
        .where('id', productId)
        .first();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      const meta = seoService.generateOpenGraphMeta(product);
      
      res.json({
        success: true,
        data: {
          product_id: productId,
          meta_tags: meta
        }
      });
    } catch (error) {
      console.error('Erreur génération meta Open Graph:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des meta Open Graph'
      });
    }
  }

  /**
   * Optimise les URLs pour le SEO
   */
  async optimizeUrls(req, res) {
    try {
      const optimizations = await seoService.optimizeUrls();
      
      res.json({
        success: true,
        message: `${optimizations.length} optimisations appliquées`,
        data: {
          optimizations: optimizations
        }
      });
    } catch (error) {
      console.error('Erreur optimisation URLs:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'optimisation des URLs'
      });
    }
  }

  /**
   * Active la planification automatique du sitemap
   */
  async scheduleSitemap(req, res) {
    try {
      await seoService.scheduleSitemapGeneration();
      
      res.json({
        success: true,
        message: 'Planification automatique du sitemap activée'
      });
    } catch (error) {
      console.error('Erreur planification sitemap:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la planification du sitemap'
      });
    }
  }

  /**
   * Génère un slug à partir d'un texte
   */
  async generateSlug(req, res) {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Texte requis pour générer le slug'
        });
      }
      
      const slug = seoService.generateSlug(text);
      
      res.json({
        success: true,
        data: {
          original_text: text,
          slug: slug
        }
      });
    } catch (error) {
      console.error('Erreur génération slug:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du slug'
      });
    }
  }

  /**
   * Endpoint pour servir le sitemap XML
   */
  async serveSitemap(req, res) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
      
      try {
        const sitemapContent = await fs.readFile(sitemapPath, 'utf8');
        res.set('Content-Type', 'application/xml');
        res.send(sitemapContent);
      } catch (fileError) {
        // Si le fichier n'existe pas, le générer
        await seoService.generateSitemap();
        const sitemapContent = await fs.readFile(sitemapPath, 'utf8');
        res.set('Content-Type', 'application/xml');
        res.send(sitemapContent);
      }
    } catch (error) {
      console.error('Erreur service sitemap:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du service du sitemap'
      });
    }
  }

  /**
   * Endpoint pour servir le robots.txt
   */
  async serveRobotsTxt(req, res) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
      
      try {
        const robotsContent = await fs.readFile(robotsPath, 'utf8');
        res.set('Content-Type', 'text/plain');
        res.send(robotsContent);
      } catch (fileError) {
        // Si le fichier n'existe pas, le générer
        await seoService.generateRobotsTxt();
        const robotsContent = await fs.readFile(robotsPath, 'utf8');
        res.set('Content-Type', 'text/plain');
        res.send(robotsContent);
      }
    } catch (error) {
      console.error('Erreur service robots.txt:', error);
      res.status(500).send('# Erreur lors du chargement du robots.txt');
    }
  }

  /**
   * Analyse SEO d'une page/entité
   */
  async analyzeSeo(req, res) {
    try {
      const { type, id } = req.params; // type: 'product', 'category', 'store'
      const db = require('../config/database');
      
      let entity;
      let tableName = type + 's'; // products, categories, stores
      
      entity = await db(tableName)
        .where('id', id)
        .first();

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: `${type} non trouvé`
        });
      }

      // Analyse SEO
      const analysis = {
        title_length: entity.name ? entity.name.length : 0,
        description_length: entity.description ? entity.description.length : 0,
        has_slug: !!entity.slug,
        slug_seo_friendly: entity.slug ? this.isSlugSeoFriendly(entity.slug) : false,
        has_meta_description: !!entity.meta_description,
        has_meta_keywords: !!entity.meta_keywords,
        title_optimal: entity.name && entity.name.length >= 30 && entity.name.length <= 60,
        description_optimal: entity.description && entity.description.length >= 120 && entity.description.length <= 160,
        images_have_alt: true, // À analyser selon les données d'images
        score: 0
      };

      // Calcul du score SEO (sur 100)
      let score = 0;
      if (analysis.has_slug) score += 20;
      if (analysis.slug_seo_friendly) score += 10;
      if (analysis.title_optimal) score += 20;
      if (analysis.description_optimal) score += 20;
      if (analysis.has_meta_description) score += 15;
      if (analysis.has_meta_keywords) score += 10;
      if (analysis.images_have_alt) score += 5;

      analysis.score = score;
      
      // Recommandations
      const recommendations = [];
      if (!analysis.has_slug) recommendations.push('Ajouter un slug URL');
      if (!analysis.slug_seo_friendly) recommendations.push('Optimiser le slug pour le SEO');
      if (!analysis.title_optimal) recommendations.push('Optimiser la longueur du titre (30-60 caractères)');
      if (!analysis.description_optimal) recommendations.push('Optimiser la longueur de la description (120-160 caractères)');
      if (!analysis.has_meta_description) recommendations.push('Ajouter une meta description');
      if (!analysis.has_meta_keywords) recommendations.push('Ajouter des mots-clés pertinents');

      res.json({
        success: true,
        data: {
          entity_type: type,
          entity_id: id,
          entity_name: entity.name,
          seo_analysis: analysis,
          recommendations: recommendations
        }
      });
    } catch (error) {
      console.error('Erreur analyse SEO:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse SEO'
      });
    }
  }

  /**
   * Vérifie si un slug est SEO-friendly
   */
  isSlugSeoFriendly(slug) {
    // Un bon slug : 
    // - contient seulement des lettres, chiffres et tirets
    // - pas de caractères spéciaux
    // - pas trop long (< 50 caractères)
    // - pas de tirets multiples
    const isValid = /^[a-z0-9-]+$/.test(slug) && 
                   slug.length <= 50 && 
                   !/-{2,}/.test(slug) && 
                   !slug.startsWith('-') && 
                   !slug.endsWith('-');
    
    return isValid;
  }
}

// Validations
const canonicalUrlValidation = [
  query('path').optional().isString().withMessage('Le path doit être une chaîne'),
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }
    next();
  }
];

const generateSlugValidation = [
  (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  SeoController: new SeoController(),
  canonicalUrlValidation,
  generateSlugValidation
};