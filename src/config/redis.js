const { createClient } = require('redis');
require('dotenv').config();

/**
 * Configuration Redis avec fallback gracieux
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isEnabled = process.env.REDIS_ENABLED !== 'false';
    
    if (this.isEnabled) {
      this.init();
    } else {
      console.log('⚠️ Redis désactivé via REDIS_ENABLED=false');
    }
  }

  async init() {
    try {
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          connectTimeout: 5000,
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB) || 0,
      };

      this.client = createClient(redisConfig);

      // Gestion des événements
      this.client.on('connect', () => {
        console.log('🔄 Connexion à Redis en cours...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connecté et prêt');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Erreur Redis:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Connexion Redis fermée');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Reconnexion à Redis...');
      });

      // Tentative de connexion avec timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de connexion Redis')), 5000)
        )
      ]);

    } catch (error) {
      console.warn('⚠️ Redis indisponible, mode dégradé activé:', error.message);
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Cache avec fallback
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected || !this.client) {
      console.log(`📝 Cache (mémoire): SET ${key}`);
      return true; // Simulation du succès
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('❌ Erreur cache SET:', error.message);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      console.log(`📖 Cache (mémoire): GET ${key} -> null`);
      return null; // En mode dégradé, pas de cache
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Erreur cache GET:', error.message);
      return null;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      console.log(`🗑️ Cache (mémoire): DEL ${key}`);
      return true;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('❌ Erreur cache DEL:', error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Erreur cache EXISTS:', error.message);
      return false;
    }
  }

  async keys(pattern = '*') {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('❌ Erreur cache KEYS:', error.message);
      return [];
    }
  }

  async flushall() {
    if (!this.isConnected || !this.client) {
      console.log('🧹 Cache (mémoire): FLUSHALL simulé');
      return true;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('❌ Erreur cache FLUSHALL:', error.message);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isConnected || !this.client) {
      console.log(`🗑️ Cache (mémoire): DELPATTERN ${pattern} simulé`);
      return true;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur cache DELPATTERN:', error.message);
      return false;
    }
  }

  // Méthodes pour les sets Redis
  async sadd(key, ...members) {
    if (!this.isConnected || !this.client) {
      console.log(`📝 Set (mémoire): SADD ${key} simulé`);
      return true;
    }

    try {
      await this.client.sAdd(key, members);
      return true;
    } catch (error) {
      console.error('❌ Erreur set SADD:', error.message);
      return false;
    }
  }

  async srem(key, ...members) {
    if (!this.isConnected || !this.client) {
      console.log(`🗑️ Set (mémoire): SREM ${key} simulé`);
      return true;
    }

    try {
      await this.client.sRem(key, members);
      return true;
    } catch (error) {
      console.error('❌ Erreur set SREM:', error.message);
      return false;
    }
  }

  async smembers(key) {
    if (!this.isConnected || !this.client) {
      console.log(`📖 Set (mémoire): SMEMBERS ${key} -> []`);
      return [];
    }

    try {
      return await this.client.sMembers(key);
    } catch (error) {
      console.error('❌ Erreur set SMEMBERS:', error.message);
      return [];
    }
  }

  async sismember(key, member) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      return await this.client.sIsMember(key, member);
    } catch (error) {
      console.error('❌ Erreur set SISMEMBER:', error.message);
      return false;
    }
  }

  async scard(key) {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      return await this.client.sCard(key);
    } catch (error) {
      console.error('❌ Erreur set SCARD:', error.message);
      return 0;
    }
  }

  async ping() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis non connecté');
    }

    try {
      return await this.client.ping();
    } catch (error) {
      console.error('❌ Erreur cache PING:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('✅ Redis déconnecté proprement');
      } catch (error) {
        console.error('❌ Erreur lors de la déconnexion Redis:', error.message);
      }
    }
  }

  // Getter pour compatibilité
  get isReady() {
    return this.isConnected;
  }

  // Méthodes de statistiques
  async getStats() {
    if (!this.isConnected || !this.client) {
      return {
        status: 'disconnected',
        mode: 'degraded',
        memory: null,
        connections: null
      };
    }

    try {
      const info = await this.client.info('memory');
      const connections = await this.client.info('clients');
      
      return {
        status: 'connected',
        mode: 'redis',
        memory: info,
        connections: connections
      };
    } catch (error) {
      return {
        status: 'error',
        mode: 'degraded',
        error: error.message
      };
    }
  }
}

// Créer l'instance unique
const redisClient = new RedisClient();

// Clés prédéfinies pour différents types de cache
const CACHE_KEYS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories', 
  STORES: 'stores',
  USER_PROFILE: (userId) => `user:${userId}`,
  USER_WISHLIST: (userId) => `wishlist:${userId}`,
  USER_CART: (userId) => `cart:${userId}`,
  USER_TICKETS: (userId) => `tickets:${userId}`,
  PRODUCT_VIEWS: (productId) => `product:${productId}:views`,
  SEARCH_RESULTS: (query) => `search:${Buffer.from(query).toString('base64')}`,
  ANALYTICS: 'analytics',
  POPULAR_PRODUCTS: 'popular_products',
  FEATURED_PRODUCTS: 'featured_products'
};

// Export des méthodes pour compatibilité
module.exports = {
  // Instance principale
  client: redisClient.client,
  
  // Alias pour compatibilité
  cache: {
    set: redisClient.set.bind(redisClient),
    get: redisClient.get.bind(redisClient),
    del: redisClient.del.bind(redisClient),
    exists: redisClient.exists.bind(redisClient),
    keys: redisClient.keys.bind(redisClient),
    flushall: redisClient.flushall.bind(redisClient),
    delPattern: redisClient.delPattern.bind(redisClient),
    ping: redisClient.ping.bind(redisClient)
  },
  
  // Méthodes de cache (directes)
  set: redisClient.set.bind(redisClient),
  get: redisClient.get.bind(redisClient),
  del: redisClient.del.bind(redisClient),
  exists: redisClient.exists.bind(redisClient),
  keys: redisClient.keys.bind(redisClient),
  flushall: redisClient.flushall.bind(redisClient),
  delPattern: redisClient.delPattern.bind(redisClient),
  ping: redisClient.ping.bind(redisClient),
  disconnect: redisClient.disconnect.bind(redisClient),
  
  // Méthodes pour les sets
  sets: {
    add: redisClient.sadd.bind(redisClient),
    remove: redisClient.srem.bind(redisClient),
    members: redisClient.smembers.bind(redisClient),
    isMember: redisClient.sismember.bind(redisClient),
    count: redisClient.scard.bind(redisClient)
  },
  
  // Clés de cache
  CACHE_KEYS,
  
  // Propriétés
  get isReady() {
    return redisClient.isReady;
  },
  
  get isConnected() {
    return redisClient.isConnected;
  },
  
  // Statistiques
  getStats: redisClient.getStats.bind(redisClient),
  
  // Instance pour accès avancé
  getInstance: () => redisClient
};

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisClient.disconnect();
  process.exit(0);
});