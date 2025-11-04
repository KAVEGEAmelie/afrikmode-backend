const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Service de génération et gestion des sitemaps
 */
class SitemapService {
  constructor() {
    this.sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    this.robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    this.baseUrl = process.env.BASE_URL || 'https://afrikmode.com';
    
    // Assurer que le dossier public existe
    this.ensurePublicDir();
  }

  /**
   * Assure que le dossier public existe
   */
  async ensurePublicDir() {
    const publicDir = path.join(process.cwd(), 'public');
    try {
      await fs.access(publicDir);
    } catch (error) {
      await fs.mkdir(publicDir, { recursive: true });
    }
  }

  /**
   * Génère le sitemap XML complet
   */
  async generateSitemap() {
    try {
      const urls = [];

      // URLs statiques
      urls.push(...await this.getStaticUrls());

      // URLs des produits
      urls.push(...await this.getProductUrls());

      // URLs des catégories
      urls.push(...await this.getCategoryUrls());

      // URLs des boutiques
      urls.push(...await this.getStoreUrls());

      // URLs des pages
      urls.push(...await this.getPageUrls());

      // Générer le XML
      const xml = this.generateSitemapXML(urls);

      // Écrire le fichier
      await fs.writeFile(this.sitemapPath, xml, 'utf8');

      console.log(`Sitemap généré avec ${urls.length} URLs`);
      return {
        success: true,
        urls_count: urls.length,
        file_path: this.sitemapPath
      };

    } catch (error) {
      console.error('Erreur génération sitemap:', error);
      throw error;
    }
  }

  /**
   * Récupère les URLs statiques
   */
  async getStaticUrls() {
    const staticPages = [
      { loc: '', priority: '1.0', changefreq: 'weekly' },
      { loc: '/about', priority: '0.8', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
      { loc: '/privacy', priority: '0.5', changefreq: 'yearly' },
      { loc: '/terms', priority: '0.5', changefreq: 'yearly' },
      { loc: '/help', priority: '0.6', changefreq: 'monthly' },
      { loc: '/stores', priority: '0.9', changefreq: 'daily' },
      { loc: '/products', priority: '0.9', changefreq: 'hourly' },
      { loc: '/categories', priority: '0.8', changefreq: 'daily' }
    ];

    return staticPages.map(page => ({
      ...page,
      loc: this.baseUrl + page.loc,
      lastmod: new Date().toISOString().split('T')[0]
    }));
  }

  /**
   * Récupère les URLs des produits
   */
  async getProductUrls() {
    const products = await db('products')
      .where('is_active', true)
      .select('id', 'slug', 'updated_at');

    return products.map(product => ({
      loc: `${this.baseUrl}/products/${product.slug || product.id}`,
      lastmod: new Date(product.updated_at).toISOString().split('T')[0],
      priority: '0.8',
      changefreq: 'daily'
    }));
  }

  /**
   * Récupère les URLs des catégories
   */
  async getCategoryUrls() {
    const categories = await db('categories')
      .where('is_active', true)
      .select('id', 'slug', 'updated_at');

    return categories.map(category => ({
      loc: `${this.baseUrl}/categories/${category.slug || category.id}`,
      lastmod: new Date(category.updated_at).toISOString().split('T')[0],
      priority: '0.7',
      changefreq: 'weekly'
    }));
  }

  /**
   * Récupère les URLs des boutiques
   */
  async getStoreUrls() {
    const stores = await db('stores')
      .where('is_active', true)
      .select('id', 'slug', 'updated_at');

    return stores.map(store => ({
      loc: `${this.baseUrl}/stores/${store.slug || store.id}`,
      lastmod: new Date(store.updated_at).toISOString().split('T')[0],
      priority: '0.6',
      changefreq: 'weekly'
    }));
  }

  /**
   * Récupère les URLs des pages personnalisées
   */
  async getPageUrls() {
    // Si vous avez une table pages pour du contenu dynamique
    try {
      const pages = await db('pages')
        .where('is_published', true)
        .select('slug', 'updated_at');

      return pages.map(page => ({
        loc: `${this.baseUrl}/${page.slug}`,
        lastmod: new Date(page.updated_at).toISOString().split('T')[0],
        priority: '0.6',
        changefreq: 'monthly'
      }));
    } catch (error) {
      // Table pages n'existe pas encore
      return [];
    }
  }

  /**
   * Génère le XML du sitemap
   */
  generateSitemapXML(urls) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority) {
        xml += `    <priority>${url.priority}</priority>\n`;
      }
      
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Génère le fichier robots.txt
   */
  async generateRobotsTxt() {
    try {
      let robotsContent = `# AfrikMode - Robots.txt
# Généré automatiquement le ${new Date().toISOString().split('T')[0]}

# Règles pour tous les robots
User-agent: *

# Autoriser l'indexation de base
Allow: /
Allow: /products/
Allow: /categories/
Allow: /stores/

# Interdire les répertoires admin et privés
Disallow: /admin/
Disallow: /api/
Disallow: /uploads/temp/
Disallow: /cart/
Disallow: /checkout/
Disallow: /account/
Disallow: /login/
Disallow: /register/
Disallow: /search?*

# Interdire les paramètres de tracking
Disallow: /*?utm_*
Disallow: /*?fb_*
Disallow: /*?gclid*
Disallow: /*?ref=*

# Règles spécifiques pour Google
User-agent: Googlebot
Allow: /api/health

# Règles pour les robots de réseaux sociaux
User-agent: facebookexternalhit
Allow: /products/
Allow: /stores/

User-agent: Twitterbot
Allow: /products/
Allow: /stores/

# Délai entre les requêtes (en secondes)
Crawl-delay: 1

# Localisation du sitemap
Sitemap: ${this.baseUrl}/sitemap.xml

# Informations additionnelles
# Contact: admin@afrikmode.com
# Politique de confidentialité: ${this.baseUrl}/privacy
`;

      await fs.writeFile(this.robotsPath, robotsContent, 'utf8');

      console.log('Robots.txt généré avec succès');
      return {
        success: true,
        file_path: this.robotsPath
      };

    } catch (error) {
      console.error('Erreur génération robots.txt:', error);
      throw error;
    }
  }

  /**
   * Génère les métadonnées Schema.org pour un produit
   */
  generateProductSchema(product, store = null, reviews = []) {
    const schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.images ? JSON.parse(product.images)[0] : null,
      "brand": {
        "@type": "Brand",
        "name": store ? store.name : "AfrikMode"
      },
      "sku": product.sku || product.id.toString(),
      "mpn": product.id.toString(),
      "offers": {
        "@type": "Offer",
        "url": `${this.baseUrl}/products/${product.slug || product.id}`,
        "priceCurrency": "EUR",
        "price": product.price,
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "availability": product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": store ? store.name : "AfrikMode"
        }
      }
    };

    // Ajouter les catégories
    if (product.category_name) {
      schema.category = product.category_name;
    }

    // Ajouter les avis si disponibles
    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = totalRating / reviews.length;

      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": avgRating.toFixed(1),
        "reviewCount": reviews.length,
        "bestRating": 5,
        "worstRating": 1
      };

      schema.review = reviews.slice(0, 5).map(review => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.user_name || "Client vérifié"
        },
        "datePublished": new Date(review.created_at).toISOString().split('T')[0],
        "reviewBody": review.comment,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": 5,
          "worstRating": 1
        }
      }));
    }

    return schema;
  }

  /**
   * Génère les métadonnées Schema.org pour une boutique
   */
  generateStoreSchema(store) {
    return {
      "@context": "https://schema.org/",
      "@type": "Store",
      "name": store.name,
      "description": store.description,
      "url": `${this.baseUrl}/stores/${store.slug || store.id}`,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": store.country || "FR",
        "addressLocality": store.city,
        "streetAddress": store.address
      },
      "telephone": store.phone,
      "email": store.email,
      "image": store.logo_url,
      "openingHours": [
        "Mo-Sa 09:00-18:00"
      ],
      "paymentAccepted": [
        "Cash",
        "Credit Card",
        "PayPal"
      ]
    };
  }

  /**
   * Génère les métadonnées Schema.org pour l'organisation
   */
  generateOrganizationSchema() {
    return {
      "@context": "https://schema.org/",
      "@type": "Organization",
      "name": "AfrikMode",
      "description": "Plateforme e-commerce spécialisée dans la mode africaine",
      "url": this.baseUrl,
      "logo": `${this.baseUrl}/assets/logo.png`,
      "sameAs": [
        "https://www.facebook.com/afrikmode",
        "https://www.instagram.com/afrikmode",
        "https://twitter.com/afrikmode"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+33-1-23-45-67-89",
        "contactType": "customer service",
        "email": "contact@afrikmode.com",
        "availableLanguage": ["French", "English"]
      }
    };
  }

  /**
   * Génère les métadonnées Schema.org pour une recherche
   */
  generateSearchSchema() {
    return {
      "@context": "https://schema.org/",
      "@type": "WebSite",
      "name": "AfrikMode",
      "url": this.baseUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${this.baseUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };
  }

  /**
   * Génère les URLs canoniques
   */
  generateCanonicalUrls() {
    return {
      // Fonction utilitaire pour générer les URLs canoniques
      getCanonicalUrl: (path, params = {}) => {
        let url = this.baseUrl + path;
        
        // Supprimer les paramètres de tracking
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ref'];
        const cleanParams = Object.keys(params).filter(key => !trackingParams.includes(key));
        
        if (cleanParams.length > 0) {
          const queryString = cleanParams
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
          url += `?${queryString}`;
        }
        
        return url;
      }
    };
  }

  /**
   * Génère les métadonnées Open Graph pour un produit
   */
  generateOpenGraphMeta(product, type = 'product') {
    const meta = {
      'og:title': product.name,
      'og:description': product.description?.substring(0, 155) + '...',
      'og:type': type,
      'og:url': `${this.baseUrl}/products/${product.slug || product.id}`,
      'og:site_name': 'AfrikMode',
      'og:locale': 'fr_FR'
    };

    if (product.images) {
      const images = JSON.parse(product.images);
      if (images.length > 0) {
        meta['og:image'] = images[0];
        meta['og:image:width'] = '1200';
        meta['og:image:height'] = '630';
        meta['og:image:alt'] = product.name;
      }
    }

    if (type === 'product') {
      meta['product:price:amount'] = product.price;
      meta['product:price:currency'] = 'EUR';
      meta['product:availability'] = product.stock_quantity > 0 ? 'instock' : 'oos';
    }

    return meta;
  }

  /**
   * Planifie la génération automatique du sitemap
   */
  async scheduleSitemapGeneration() {
    const cron = require('node-cron');
    
    // Générer le sitemap tous les jours à 2h du matin
    cron.schedule('0 2 * * *', async () => {
      console.log('Génération automatique du sitemap...');
      try {
        await this.generateSitemap();
        await this.generateRobotsTxt();
        console.log('Sitemap et robots.txt générés automatiquement');
      } catch (error) {
        console.error('Erreur génération automatique sitemap:', error);
      }
    });

    console.log('Planification automatique du sitemap activée');
  }

  /**
   * Échappe les caractères XML
   */
  escapeXml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Vérifie et optimise les URLs pour le SEO
   */
  async optimizeUrls() {
    const optimizations = [];

    // Vérifier les produits sans slug
    const productsWithoutSlug = await db('products')
      .whereNull('slug')
      .select('id', 'name');

    for (let product of productsWithoutSlug) {
      const slug = this.generateSlug(product.name);
      await db('products').where('id', product.id).update({ slug });
      optimizations.push(`Slug généré pour produit ${product.id}: ${slug}`);
    }

    // Vérifier les catégories sans slug
    const categoriesWithoutSlug = await db('categories')
      .whereNull('slug')
      .select('id', 'name');

    for (let category of categoriesWithoutSlug) {
      const slug = this.generateSlug(category.name);
      await db('categories').where('id', category.id).update({ slug });
      optimizations.push(`Slug généré pour catégorie ${category.id}: ${slug}`);
    }

    // Vérifier les boutiques sans slug
    const storesWithoutSlug = await db('stores')
      .whereNull('slug')
      .select('id', 'name');

    for (let store of storesWithoutSlug) {
      const slug = this.generateSlug(store.name);
      await db('stores').where('id', store.id).update({ slug });
      optimizations.push(`Slug généré pour boutique ${store.id}: ${slug}`);
    }

    return optimizations;
  }

  /**
   * Génère un slug à partir d'un texte
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
      .trim()
      .replace(/\s+/g, '-') // Remplacer espaces par tirets
      .replace(/-+/g, '-'); // Supprimer tirets multiples
  }
}

module.exports = new SitemapService();