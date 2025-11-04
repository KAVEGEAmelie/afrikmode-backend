const db = require('../config/database');
const redis = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

class OfflineCacheService {
  constructor() {
    this.cachePrefix = 'offline:';
    this.defaultTtl = 24 * 60 * 60; // 24 heures en secondes
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB par utilisateur
    this.compressionEnabled = true;
  }

  /**
   * Cache les produits pour utilisation hors ligne
   */
  async cacheProducts(userId, options = {}) {
    try {
      const {
        categories = [],
        priceRange = null,
        location = null,
        limit = 100,
        includeImages = true,
        includeDetails = true
      } = options;

      // Construire la requête produits avec optimisations
      let query = db('products')
        .join('stores', 'products.store_id', '=', 'stores.id')
        .join('categories', 'products.category_id', '=', 'categories.id')
        .select(
          'products.id',
          'products.name',
          'products.description',
          'products.price',
          'products.currency',
          'products.stock_quantity',
          'products.images',
          'products.rating',
          'products.reviews_count',
          'products.created_at',
          'products.updated_at',
          'stores.id as store_id',
          'stores.name as store_name',
          'stores.logo as store_logo',
          'stores.location as store_location',
          'categories.name as category_name',
          'categories.slug as category_slug'
        )
        .where('products.is_active', true)
        .where('stores.is_active', true)
        .orderBy('products.created_at', 'desc')
        .limit(limit);

      // Filtres optionnels
      if (categories.length > 0) {
        query = query.whereIn('categories.slug', categories);
      }

      if (priceRange) {
        query = query
          .where('products.price', '>=', priceRange.min)
          .where('products.price', '<=', priceRange.max);
      }

      if (location) {
        query = query.where('stores.location', 'ilike', `%${location}%`);
      }

      const products = await query;

      // Traiter les données pour le cache
      const processedProducts = products.map(product => {
        const processed = {
          id: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency,
          stock_quantity: product.stock_quantity,
          rating: parseFloat(product.rating) || 0,
          reviews_count: product.reviews_count || 0,
          store: {
            id: product.store_id,
            name: product.store_name,
            logo: product.store_logo,
            location: product.store_location
          },
          category: {
            name: product.category_name,
            slug: product.category_slug
          },
          cached_at: new Date().toISOString()
        };

        // Inclure les détails si demandé
        if (includeDetails) {
          processed.description = this.truncateText(product.description, 200);
        }

        // Traitement des images
        if (includeImages && product.images) {
          const imageUrls = product.images.split(',');
          processed.images = {
            thumbnail: imageUrls[0], // Première image comme miniature
            gallery: imageUrls.slice(0, 3) // Maximum 3 images pour économiser l'espace
          };
        }

        return processed;
      });

      // Métadonnées du cache
      const cacheMetadata = {
        userId,
        type: 'products',
        count: processedProducts.length,
        filters: options,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + this.defaultTtl * 1000).toISOString(),
        version: '1.0'
      };

      const cacheData = {
        metadata: cacheMetadata,
        data: processedProducts
      };

      // Stocker dans Redis avec compression
      const cacheKey = `${this.cachePrefix}products:${userId}`;
      await this.setCacheData(cacheKey, cacheData, this.defaultTtl);

      // Enregistrer l'activité de cache en base
      await this.logCacheActivity(userId, 'products', 'cached', {
        count: processedProducts.length,
        size: JSON.stringify(cacheData).length,
        filters: options
      });

      return {
        success: true,
        cached: processedProducts.length,
        metadata: cacheMetadata,
        size: this.formatBytes(JSON.stringify(cacheData).length)
      };

    } catch (error) {
      console.error('Erreur cache produits hors ligne:', error);
      throw error;
    }
  }

  /**
   * Cache les catégories pour navigation hors ligne
   */
  async cacheCategories(userId, options = {}) {
    try {
      const { includeSubcategories = true, includeProductCount = true } = options;

      let query = db('categories')
        .select('id', 'name', 'slug', 'description', 'image', 'parent_id', 'sort_order')
        .where('is_active', true)
        .orderBy('sort_order')
        .orderBy('name');

      const categories = await query;

      // Organiser en hiérarchie si demandé
      const processedCategories = includeSubcategories 
        ? this.buildCategoryHierarchy(categories)
        : categories;

      // Ajouter le nombre de produits si demandé
      if (includeProductCount) {
        for (const category of processedCategories) {
          const productCount = await db('products')
            .where('category_id', category.id)
            .where('is_active', true)
            .count('* as count')
            .first();
          
          category.product_count = parseInt(productCount.count);
        }
      }

      const cacheData = {
        metadata: {
          userId,
          type: 'categories',
          count: processedCategories.length,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + this.defaultTtl * 1000).toISOString()
        },
        data: processedCategories
      };

      const cacheKey = `${this.cachePrefix}categories:${userId}`;
      await this.setCacheData(cacheKey, cacheData, this.defaultTtl);

      await this.logCacheActivity(userId, 'categories', 'cached', {
        count: processedCategories.length
      });

      return {
        success: true,
        cached: processedCategories.length,
        metadata: cacheData.metadata
      };

    } catch (error) {
      console.error('Erreur cache catégories:', error);
      throw error;
    }
  }

  /**
   * Cache le profil utilisateur et ses données personnelles
   */
  async cacheUserProfile(userId) {
    try {
      // Données utilisateur
      const user = await db('users')
        .select('id', 'full_name', 'email', 'avatar', 'location', 'phone', 'preferences')
        .where('id', userId)
        .first();

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Commandes récentes
      const recentOrders = await db('orders')
        .select('id', 'order_number', 'total_amount', 'currency', 'status', 'created_at')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(10);

      // Adresses de livraison
      const addresses = await db('user_addresses')
        .select('id', 'type', 'address_line', 'city', 'postal_code', 'country', 'is_default')
        .where('user_id', userId)
        .where('is_active', true);

      // Favoris
      const wishlist = await db('wishlists')
        .join('products', 'wishlists.product_id', '=', 'products.id')
        .select(
          'products.id',
          'products.name',
          'products.price',
          'products.currency',
          'products.images'
        )
        .where('wishlists.user_id', userId)
        .limit(20);

      const cacheData = {
        metadata: {
          userId,
          type: 'user_profile',
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + this.defaultTtl * 1000).toISOString()
        },
        data: {
          profile: {
            ...user,
            preferences: typeof user.preferences === 'string' 
              ? JSON.parse(user.preferences) 
              : user.preferences
          },
          recentOrders: recentOrders.map(order => ({
            ...order,
            total_amount: parseFloat(order.total_amount)
          })),
          addresses,
          wishlist: wishlist.map(item => ({
            ...item,
            images: item.images ? item.images.split(',')[0] : null // Première image seulement
          }))
        }
      };

      const cacheKey = `${this.cachePrefix}profile:${userId}`;
      await this.setCacheData(cacheKey, cacheData, this.defaultTtl);

      await this.logCacheActivity(userId, 'user_profile', 'cached', {
        orders_count: recentOrders.length,
        addresses_count: addresses.length,
        wishlist_count: wishlist.length
      });

      return {
        success: true,
        metadata: cacheData.metadata,
        profile: cacheData.data.profile
      };

    } catch (error) {
      console.error('Erreur cache profil utilisateur:', error);
      throw error;
    }
  }

  /**
   * Cache les boutiques populaires
   */
  async cachePopularStores(userId, options = {}) {
    try {
      const { location = null, limit = 20 } = options;

      let query = db('stores')
        .select(
          'id', 'name', 'description', 'logo', 'banner', 'location', 
          'rating', 'reviews_count', 'products_count', 'category',
          'created_at'
        )
        .where('is_active', true)
        .orderBy('rating', 'desc')
        .orderBy('reviews_count', 'desc')
        .limit(limit);

      if (location) {
        query = query.where('location', 'ilike', `%${location}%`);
      }

      const stores = await query;

      const processedStores = stores.map(store => ({
        ...store,
        rating: parseFloat(store.rating) || 0,
        description: this.truncateText(store.description, 100)
      }));

      const cacheData = {
        metadata: {
          userId,
          type: 'popular_stores',
          count: processedStores.length,
          cached_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + this.defaultTtl * 1000).toISOString()
        },
        data: processedStores
      };

      const cacheKey = `${this.cachePrefix}stores:${userId}`;
      await this.setCacheData(cacheKey, cacheData, this.defaultTtl);

      return {
        success: true,
        cached: processedStores.length,
        metadata: cacheData.metadata
      };

    } catch (error) {
      console.error('Erreur cache boutiques populaires:', error);
      throw error;
    }
  }

  /**
   * Récupération des données en cache
   */
  async getCachedData(userId, dataType) {
    try {
      const cacheKey = `${this.cachePrefix}${dataType}:${userId}`;
      const cachedData = await this.getCacheData(cacheKey);

      if (!cachedData) {
        return { success: false, error: 'Aucune donnée en cache' };
      }

      // Vérifier l'expiration
      const expiresAt = new Date(cachedData.metadata.expires_at);
      if (expiresAt < new Date()) {
        await redis.del(cacheKey);
        return { success: false, error: 'Cache expiré' };
      }

      await this.logCacheActivity(userId, dataType, 'accessed');

      return {
        success: true,
        data: cachedData.data,
        metadata: cachedData.metadata
      };

    } catch (error) {
      console.error('Erreur récupération cache:', error);
      throw error;
    }
  }

  /**
   * Synchronisation des données modifiées
   */
  async syncOfflineChanges(userId, changes) {
    try {
      const syncResults = [];

      for (const change of changes) {
        try {
          let result = null;

          switch (change.type) {
            case 'wishlist_add':
              result = await this.syncWishlistAdd(userId, change.data);
              break;
            case 'wishlist_remove':
              result = await this.syncWishlistRemove(userId, change.data);
              break;
            case 'cart_update':
              result = await this.syncCartUpdate(userId, change.data);
              break;
            case 'profile_update':
              result = await this.syncProfileUpdate(userId, change.data);
              break;
            case 'address_add':
              result = await this.syncAddressAdd(userId, change.data);
              break;
            default:
              result = { success: false, error: 'Type de changement non supporté' };
          }

          syncResults.push({
            changeId: change.id,
            type: change.type,
            ...result
          });

        } catch (error) {
          console.error(`Erreur sync changement ${change.type}:`, error);
          syncResults.push({
            changeId: change.id,
            type: change.type,
            success: false,
            error: error.message
          });
        }
      }

      // Log de l'activité de synchronisation
      const successful = syncResults.filter(r => r.success).length;
      const failed = syncResults.filter(r => !r.success).length;

      await this.logCacheActivity(userId, 'sync', 'completed', {
        changes_count: changes.length,
        successful,
        failed
      });

      return {
        success: true,
        totalChanges: changes.length,
        successful,
        failed,
        results: syncResults
      };

    } catch (error) {
      console.error('Erreur synchronisation changements hors ligne:', error);
      throw error;
    }
  }

  /**
   * Nettoyage du cache utilisateur
   */
  async clearUserCache(userId, dataTypes = null) {
    try {
      const typesToClear = dataTypes || ['products', 'categories', 'profile', 'stores'];
      const clearedKeys = [];

      for (const type of typesToClear) {
        const cacheKey = `${this.cachePrefix}${type}:${userId}`;
        const deleted = await redis.del(cacheKey);
        
        if (deleted > 0) {
          clearedKeys.push(type);
        }
      }

      await this.logCacheActivity(userId, 'cache', 'cleared', {
        types_cleared: clearedKeys
      });

      return {
        success: true,
        clearedTypes: clearedKeys,
        message: `Cache nettoyé pour ${clearedKeys.length} types de données`
      };

    } catch (error) {
      console.error('Erreur nettoyage cache utilisateur:', error);
      throw error;
    }
  }

  /**
   * Statistiques d'utilisation du cache
   */
  async getCacheStats(userId, days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await db('offline_cache_logs')
        .select(
          'data_type',
          'action',
          db.raw('COUNT(*) as count'),
          db.raw('AVG(CAST(metadata->>\'count\' AS INTEGER)) as avg_items'),
          db.raw('SUM(CAST(metadata->>\'size\' AS INTEGER)) as total_size')
        )
        .where('user_id', userId)
        .where('created_at', '>=', startDate)
        .groupBy('data_type', 'action')
        .orderBy('count', 'desc');

      // Taille actuelle du cache
      const currentCacheSize = await this.getCurrentCacheSize(userId);

      // Dernières activités
      const recentActivity = await db('offline_cache_logs')
        .select('data_type', 'action', 'created_at', 'metadata')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(10);

      return {
        period: { days, startDate: startDate.toISOString() },
        currentCacheSize: this.formatBytes(currentCacheSize),
        statistics: stats,
        recentActivity
      };

    } catch (error) {
      console.error('Erreur statistiques cache:', error);
      throw error;
    }
  }

  // Méthodes utilitaires privées

  async setCacheData(key, data, ttl) {
    try {
      const serialized = JSON.stringify(data);
      
      if (this.compressionEnabled) {
        const zlib = require('zlib');
        const compressed = zlib.gzipSync(serialized);
        await redis.setex(key + ':gz', ttl, compressed);
      } else {
        await redis.setex(key, ttl, serialized);
      }
    } catch (error) {
      console.error('Erreur stockage cache:', error);
      throw error;
    }
  }

  async getCacheData(key) {
    try {
      // Essayer d'abord la version compressée
      let data = await redis.get(key + ':gz');
      
      if (data && this.compressionEnabled) {
        const zlib = require('zlib');
        data = zlib.gunzipSync(data).toString();
      } else {
        data = await redis.get(key);
      }

      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erreur lecture cache:', error);
      return null;
    }
  }

  buildCategoryHierarchy(categories) {
    const categoryMap = new Map();
    const rootCategories = [];

    // Créer la map des catégories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Construire la hiérarchie
    categories.forEach(category => {
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(category.id));
        }
      } else {
        rootCategories.push(categoryMap.get(category.id));
      }
    });

    return rootCategories;
  }

  async syncWishlistAdd(userId, data) {
    try {
      // Vérifier si le produit existe
      const product = await db('products').where('id', data.productId).first();
      if (!product) {
        return { success: false, error: 'Produit non trouvé' };
      }

      // Ajouter à la wishlist
      await db('wishlists').insert({
        id: uuidv4(),
        user_id: userId,
        product_id: data.productId,
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict(['user_id', 'product_id']).ignore();

      return { success: true, message: 'Produit ajouté à la wishlist' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncWishlistRemove(userId, data) {
    try {
      await db('wishlists')
        .where({ user_id: userId, product_id: data.productId })
        .del();

      return { success: true, message: 'Produit retiré de la wishlist' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncCartUpdate(userId, data) {
    // Implementation de la synchronisation du panier
    // Dépend de votre implémentation du panier
    return { success: true, message: 'Panier mis à jour' };
  }

  async syncProfileUpdate(userId, data) {
    try {
      const allowedFields = ['full_name', 'phone', 'location', 'preferences'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date();
        
        await db('users')
          .where('id', userId)
          .update(updateData);
      }

      return { success: true, message: 'Profil mis à jour' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncAddressAdd(userId, data) {
    try {
      await db('user_addresses').insert({
        id: uuidv4(),
        user_id: userId,
        type: data.type || 'home',
        address_line: data.address_line,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
        is_default: data.is_default || false,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      return { success: true, message: 'Adresse ajoutée' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logCacheActivity(userId, dataType, action, metadata = {}) {
    try {
      await db('offline_cache_logs').insert({
        id: uuidv4(),
        user_id: userId,
        data_type: dataType,
        action,
        metadata: JSON.stringify(metadata),
        created_at: new Date()
      });
    } catch (error) {
      console.error('Erreur log activité cache:', error);
    }
  }

  async getCurrentCacheSize(userId) {
    try {
      const keys = await redis.keys(`${this.cachePrefix}*:${userId}*`);
      let totalSize = 0;

      for (const key of keys) {
        const size = await redis.memory('usage', key);
        totalSize += size || 0;
      }

      return totalSize;
    } catch (error) {
      console.error('Erreur calcul taille cache:', error);
      return 0;
    }
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new OfflineCacheService();