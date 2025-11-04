const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class DeepLinkService {
  constructor() {
    // Configuration des deep links AfrikMode
    this.baseScheme = 'afrikmode';
    this.webFallbackDomain = process.env.WEB_DOMAIN || 'https://afrikmode.com';
    this.appStoreUrl = process.env.APP_STORE_URL || 'https://apps.apple.com/app/afrikmode';
    this.playStoreUrl = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.afrikmode.app';
  }

  /**
   * Génère un deep link pour un produit
   */
  async createProductLink(productId, options = {}) {
    try {
      // Récupérer les infos du produit
      const product = await db('products')
        .join('stores', 'products.store_id', '=', 'stores.id')
        .select(
          'products.id',
          'products.name',
          'products.price',
          'products.images',
          'products.description',
          'stores.name as store_name'
        )
        .where('products.id', productId)
        .first();

      if (!product) {
        throw new Error('Produit non trouvé');
      }

      const linkData = {
        type: 'product',
        productId,
        productName: product.name,
        storeName: product.store_name,
        price: product.price,
        currency: options.currency || 'XOF',
        campaign: options.campaign || null,
        utm_source: options.utm_source || 'app',
        utm_medium: options.utm_medium || 'deep_link'
      };

      // Créer le short link
      const shortLink = await this.createShortLink(linkData, options);

      return {
        deepLink: `${this.baseScheme}://product/${productId}`,
        shortLink: shortLink.shortUrl,
        webFallback: `${this.webFallbackDomain}/product/${productId}`,
        shareData: {
          title: `${product.name} - ${product.store_name}`,
          description: this.truncateText(product.description, 120),
          image: product.images ? product.images.split(',')[0] : null,
          price: `${product.price} ${options.currency || 'XOF'}`
        },
        linkId: shortLink.id
      };

    } catch (error) {
      console.error('Erreur création lien produit:', error);
      throw error;
    }
  }

  /**
   * Génère un deep link pour une boutique
   */
  async createStoreLink(storeId, options = {}) {
    try {
      const store = await db('stores')
        .select('id', 'name', 'description', 'logo', 'category')
        .where('id', storeId)
        .first();

      if (!store) {
        throw new Error('Boutique non trouvée');
      }

      const linkData = {
        type: 'store',
        storeId,
        storeName: store.name,
        category: store.category,
        campaign: options.campaign || null,
        utm_source: options.utm_source || 'app',
        utm_medium: options.utm_medium || 'deep_link'
      };

      const shortLink = await this.createShortLink(linkData, options);

      return {
        deepLink: `${this.baseScheme}://store/${storeId}`,
        shortLink: shortLink.shortUrl,
        webFallback: `${this.webFallbackDomain}/store/${storeId}`,
        shareData: {
          title: `${store.name} - Boutique AfrikMode`,
          description: this.truncateText(store.description, 120),
          image: store.logo,
          category: store.category
        },
        linkId: shortLink.id
      };

    } catch (error) {
      console.error('Erreur création lien boutique:', error);
      throw error;
    }
  }

  /**
   * Génère un deep link pour une commande
   */
  async createOrderLink(orderId, userId, options = {}) {
    try {
      const order = await db('orders')
        .select('id', 'order_number', 'total_amount', 'currency', 'status')
        .where({ id: orderId, user_id: userId })
        .first();

      if (!order) {
        throw new Error('Commande non trouvée ou accès non autorisé');
      }

      const linkData = {
        type: 'order',
        orderId,
        orderNumber: order.order_number,
        userId,
        amount: order.total_amount,
        currency: order.currency,
        status: order.status,
        private: true // Lien privé nécessitant authentification
      };

      const shortLink = await this.createShortLink(linkData, options);

      return {
        deepLink: `${this.baseScheme}://order/${orderId}`,
        shortLink: shortLink.shortUrl,
        webFallback: `${this.webFallbackDomain}/orders/${orderId}`,
        shareData: {
          title: `Commande #${order.order_number}`,
          description: `Statut: ${order.status} - ${order.total_amount} ${order.currency}`,
          requiresAuth: true
        },
        linkId: shortLink.id
      };

    } catch (error) {
      console.error('Erreur création lien commande:', error);
      throw error;
    }
  }

  /**
   * Génère un deep link de promotion/réduction
   */
  async createPromoLink(promoCode, options = {}) {
    try {
      // Vérifier que le code promo existe
      const promo = await db('coupons')
        .select('id', 'code', 'discount_amount', 'discount_type', 'description')
        .where('code', promoCode)
        .where('is_active', true)
        .where('expires_at', '>', new Date())
        .first();

      if (!promo) {
        throw new Error('Code promo invalide ou expiré');
      }

      const linkData = {
        type: 'promotion',
        promoCode,
        promoId: promo.id,
        discountAmount: promo.discount_amount,
        discountType: promo.discount_type,
        campaign: options.campaign || 'promo_share',
        utm_source: options.utm_source || 'app',
        utm_medium: options.utm_medium || 'deep_link'
      };

      const shortLink = await this.createShortLink(linkData, options);

      const discountText = promo.discount_type === 'percentage' 
        ? `${promo.discount_amount}%`
        : `${promo.discount_amount} XOF`;

      return {
        deepLink: `${this.baseScheme}://promo/${promoCode}`,
        shortLink: shortLink.shortUrl,
        webFallback: `${this.webFallbackDomain}/promo/${promoCode}`,
        shareData: {
          title: `🎉 Code promo: ${promoCode}`,
          description: `${discountText} de réduction - ${promo.description}`,
          cta: 'Utiliser maintenant'
        },
        linkId: shortLink.id
      };

    } catch (error) {
      console.error('Erreur création lien promo:', error);
      throw error;
    }
  }

  /**
   * Génère un deep link d'invitation/parrainage
   */
  async createReferralLink(userId, options = {}) {
    try {
      // Récupérer les infos de l'utilisateur parrain
      const user = await db('users')
        .select('id', 'full_name', 'email')
        .where('id', userId)
        .first();

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Générer ou récupérer le code de parrainage
      let referralCode = await db('user_referrals')
        .where('referrer_id', userId)
        .pluck('referral_code')
        .first();

      if (!referralCode) {
        referralCode = this.generateReferralCode(user.full_name);
        
        await db('user_referrals').insert({
          id: uuidv4(),
          referrer_id: userId,
          referral_code: referralCode,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const linkData = {
        type: 'referral',
        referralCode,
        referrerId: userId,
        referrerName: user.full_name,
        campaign: options.campaign || 'user_referral',
        utm_source: options.utm_source || 'app',
        utm_medium: options.utm_medium || 'referral_link'
      };

      const shortLink = await this.createShortLink(linkData, options);

      return {
        deepLink: `${this.baseScheme}://referral/${referralCode}`,
        shortLink: shortLink.shortUrl,
        webFallback: `${this.webFallbackDomain}/referral/${referralCode}`,
        shareData: {
          title: `🎁 ${user.full_name} vous invite sur AfrikMode`,
          description: 'Rejoignez la plus grande plateforme de mode africaine et obtenez 10% de réduction',
          cta: 'S\'inscrire maintenant'
        },
        linkId: shortLink.id,
        referralCode
      };

    } catch (error) {
      console.error('Erreur création lien parrainage:', error);
      throw error;
    }
  }

  /**
   * Crée un short link stocké en base
   */
  async createShortLink(linkData, options = {}) {
    try {
      const shortCode = this.generateShortCode();
      const shortUrl = `${this.webFallbackDomain}/l/${shortCode}`;

      const linkRecord = {
        id: uuidv4(),
        short_code: shortCode,
        short_url: shortUrl,
        deep_link: this.buildDeepLinkFromData(linkData),
        link_type: linkData.type,
        target_data: JSON.stringify(linkData),
        creator_id: options.creatorId || null,
        campaign: linkData.campaign,
        utm_source: linkData.utm_source,
        utm_medium: linkData.utm_medium,
        utm_campaign: linkData.campaign,
        is_active: true,
        expires_at: options.expiresAt || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('deep_links').insert(linkRecord);

      return {
        id: linkRecord.id,
        shortCode,
        shortUrl,
        deepLink: linkRecord.deep_link
      };

    } catch (error) {
      console.error('Erreur création short link:', error);
      throw error;
    }
  }

  /**
   * Résout un short link et redirige
   */
  async resolveShortLink(shortCode, userAgent, ipAddress) {
    try {
      // Récupérer le lien
      const link = await db('deep_links')
        .where('short_code', shortCode)
        .where('is_active', true)
        .first();

      if (!link) {
        return {
          success: false,
          error: 'Lien non trouvé',
          fallback: this.webFallbackDomain
        };
      }

      // Vérifier l'expiration
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return {
          success: false,
          error: 'Lien expiré',
          fallback: this.webFallbackDomain
        };
      }

      // Enregistrer le clic
      await this.trackLinkClick(link.id, userAgent, ipAddress);

      // Déterminer la redirection selon l'appareil
      const redirectUrl = this.getRedirectUrl(link, userAgent);

      return {
        success: true,
        redirectUrl,
        linkType: link.link_type,
        deepLink: link.deep_link,
        targetData: typeof link.target_data === 'string' 
          ? JSON.parse(link.target_data) 
          : link.target_data
      };

    } catch (error) {
      console.error('Erreur résolution short link:', error);
      return {
        success: false,
        error: 'Erreur de redirection',
        fallback: this.webFallbackDomain
      };
    }
  }

  /**
   * Analyse les liens et leur performance
   */
  async getLinkAnalytics(linkId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Statistiques générales
      const totalClicks = await db('deep_link_clicks')
        .where('link_id', linkId)
        .where('clicked_at', '>=', startDate)
        .count('* as count')
        .first();

      // Clics par jour
      const clicksByDay = await db('deep_link_clicks')
        .select(
          db.raw('DATE(clicked_at) as date'),
          db.raw('COUNT(*) as clicks')
        )
        .where('link_id', linkId)
        .where('clicked_at', '>=', startDate)
        .groupBy(db.raw('DATE(clicked_at)'))
        .orderBy('date');

      // Clics par plateforme
      const clicksByPlatform = await db('deep_link_clicks')
        .select('platform', db.raw('COUNT(*) as clicks'))
        .where('link_id', linkId)
        .where('clicked_at', '>=', startDate)
        .groupBy('platform')
        .orderBy('clicks', 'desc');

      // Top pays/régions
      const clicksByCountry = await db('deep_link_clicks')
        .select('country', db.raw('COUNT(*) as clicks'))
        .where('link_id', linkId)
        .where('clicked_at', '>=', startDate)
        .whereNotNull('country')
        .groupBy('country')
        .orderBy('clicks', 'desc')
        .limit(10);

      return {
        period: { days, startDate: startDate.toISOString() },
        totalClicks: parseInt(totalClicks.count),
        clicksByDay,
        clicksByPlatform,
        clicksByCountry
      };

    } catch (error) {
      console.error('Erreur analytics deep link:', error);
      throw error;
    }
  }

  /**
   * Configuration Universal Links pour iOS
   */
  generateAppleAppSiteAssociation() {
    return {
      applinks: {
        apps: [],
        details: [{
          appID: process.env.IOS_APP_ID || 'TEAMID.com.afrikmode.app',
          paths: [
            '/product/*',
            '/store/*',
            '/order/*',
            '/promo/*',
            '/referral/*',
            '/l/*'
          ]
        }]
      }
    };
  }

  /**
   * Configuration Digital Asset Links pour Android
   */
  generateAssetLinks() {
    return [{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: process.env.ANDROID_PACKAGE_NAME || 'com.afrikmode.app',
        sha256_cert_fingerprints: [
          process.env.ANDROID_SHA256_FINGERPRINT || ''
        ]
      }
    }];
  }

  // Méthodes utilitaires privées

  buildDeepLinkFromData(linkData) {
    switch (linkData.type) {
      case 'product':
        return `${this.baseScheme}://product/${linkData.productId}`;
      case 'store':
        return `${this.baseScheme}://store/${linkData.storeId}`;
      case 'order':
        return `${this.baseScheme}://order/${linkData.orderId}`;
      case 'promotion':
        return `${this.baseScheme}://promo/${linkData.promoCode}`;
      case 'referral':
        return `${this.baseScheme}://referral/${linkData.referralCode}`;
      default:
        return `${this.baseScheme}://home`;
    }
  }

  generateShortCode() {
    // Générer un code de 6 caractères (base62)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateReferralCode(fullName) {
    const nameBase = fullName.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${nameBase}${randomSuffix}`;
  }

  getRedirectUrl(link, userAgent) {
    const targetData = typeof link.target_data === 'string' 
      ? JSON.parse(link.target_data) 
      : link.target_data;

    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isIOS = /iPhone|iPad/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    if (isMobile) {
      if (isIOS) {
        // Tenter d'ouvrir l'app, fallback vers App Store
        return link.deep_link + `?fallback=${encodeURIComponent(this.appStoreUrl)}`;
      } else if (isAndroid) {
        // Tenter d'ouvrir l'app, fallback vers Play Store
        return link.deep_link + `?fallback=${encodeURIComponent(this.playStoreUrl)}`;
      }
    }

    // Desktop ou navigateur non reconnu -> web fallback
    return this.buildWebUrl(targetData);
  }

  buildWebUrl(targetData) {
    switch (targetData.type) {
      case 'product':
        return `${this.webFallbackDomain}/product/${targetData.productId}`;
      case 'store':
        return `${this.webFallbackDomain}/store/${targetData.storeId}`;
      case 'order':
        return `${this.webFallbackDomain}/orders/${targetData.orderId}`;
      case 'promotion':
        return `${this.webFallbackDomain}/promo/${targetData.promoCode}`;
      case 'referral':
        return `${this.webFallbackDomain}/referral/${targetData.referralCode}`;
      default:
        return this.webFallbackDomain;
    }
  }

  async trackLinkClick(linkId, userAgent, ipAddress) {
    try {
      const platform = this.detectPlatform(userAgent);
      
      await db('deep_link_clicks').insert({
        id: uuidv4(),
        link_id: linkId,
        user_agent: userAgent,
        ip_address: ipAddress,
        platform,
        country: null, // Peut être enrichi avec un service de géolocalisation
        clicked_at: new Date()
      });

      // Incrémenter le compteur de clics
      await db('deep_links')
        .where('id', linkId)
        .increment('click_count', 1);

    } catch (error) {
      console.error('Erreur tracking clic deep link:', error);
    }
  }

  detectPlatform(userAgent) {
    if (/iPhone|iPad/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    if (/Windows/.test(userAgent)) return 'windows';
    if (/Mac/.test(userAgent)) return 'mac';
    return 'other';
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

module.exports = new DeepLinkService();