const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  SeoController,
  canonicalUrlValidation,
  generateSlugValidation
} = require('../controllers/seoController');

const router = express.Router();

// ================= GÉNÉRATION DE FICHIERS SEO =================

// Générer le sitemap XML
router.post('/sitemap/generate', requireAuth, SeoController.generateSitemap);

// Générer le robots.txt
router.post('/robots/generate', requireAuth, SeoController.generateRobotsTxt);

// Activer la planification automatique
router.post('/sitemap/schedule', requireAuth, SeoController.scheduleSitemap);

// ================= MÉTADONNÉES SCHEMA.ORG =================

// Schema pour un produit
router.get('/schema/product/:productId', SeoController.getProductSchema);

// Schema pour une boutique
router.get('/schema/store/:storeId', SeoController.getStoreSchema);

// Schema pour l'organisation
router.get('/schema/organization', SeoController.getOrganizationSchema);

// Schema pour la recherche
router.get('/schema/search', SeoController.getSearchSchema);

// ================= URLS CANONIQUES =================

// Générer une URL canonique
router.get('/canonical', canonicalUrlValidation, SeoController.getCanonicalUrl);

// ================= MÉTADONNÉES OPEN GRAPH =================

// Open Graph pour un produit
router.get('/opengraph/product/:productId', SeoController.getOpenGraphMeta);

// ================= OPTIMISATION =================

// Optimiser les URLs
router.post('/optimize/urls', requireAuth, SeoController.optimizeUrls);

// Générer un slug
router.post('/slug/generate', requireAuth, generateSlugValidation, SeoController.generateSlug);

// ================= ANALYSE SEO =================

// Analyser le SEO d'une entité
router.get('/analyze/:type/:id', requireAuth, SeoController.analyzeSeo);

// ================= ENDPOINTS PUBLICS POUR ROBOTS/SITEMAP =================

// Servir le sitemap XML
router.get('/sitemap.xml', SeoController.serveSitemap);

// Servir le robots.txt
router.get('/robots.txt', SeoController.serveRobotsTxt);

module.exports = router;