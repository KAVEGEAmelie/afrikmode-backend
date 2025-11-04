const redis = require('redis');
require('dotenv').config();

// Configuration Redis avec fallback si désactivé
let redisClient = null;

const initRedis = async () => {
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('📝 Redis désactivé - Cache en mémoire utilisé');
    return null;
  }

  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.log('❌ Connexion Redis refusée');
          return new Error('Le serveur Redis refuse la connexion');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    await redisClient.connect();
    console.log('✅ Redis connecté avec succès');
    return redisClient;
  } catch (error) {
    console.log('⚠️ Redis indisponible, utilisation du cache mémoire');
    return null;
  }
};

// Cache en mémoire comme fallback
const memoryCache = new Map();

// TTL par défaut (en secondes)
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL) || 3600;

/**
 * Middleware de cache avec fallback mémoire - TEMPORAIREMENT DÉSACTIVÉ
 */
const cacheMiddleware = (ttl = DEFAULT_TTL, keyGenerator = null) => {
  return (req, res, next) => {
    // Temporairement désactivé pour résoudre les problèmes de démarrage
    next();
  };
};

/**
 * Invalider le cache pour une clé spécifique
 */
const invalidateCache = async (pattern) => {
  try {
    if (redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      // Invalider cache mémoire
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }
  } catch (error) {
    console.log('Erreur invalidation cache:', error);
  }
};

/**
 * Vider tout le cache
 */
const clearCache = async () => {
  try {
    if (redisClient) {
      await redisClient.flushDb();
    } else {
      memoryCache.clear();
    }
    console.log('✅ Cache vidé avec succès');
  } catch (error) {
    console.log('Erreur vidage cache:', error);
  }
};

/**
 * Obtenir les statistiques du cache
 */
const getCacheStats = async () => {
  try {
    if (redisClient) {
      const info = await redisClient.info('memory');
      return {
        type: 'redis',
        connected: true,
        info
      };
    } else {
      return {
        type: 'memory',
        connected: false,
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys())
      };
    }
  } catch (error) {
    return {
      type: 'error',
      connected: false,
      error: error.message
    };
  }
};

// Initialiser Redis au démarrage
initRedis();

// Nettoyer le cache mémoire périodiquement (toutes les 10 minutes)
setInterval(() => {
  if (!redisClient) {
    const now = Date.now();
    for (const [key, cached] of memoryCache.entries()) {
      if (now > cached.expiry) {
        memoryCache.delete(key);
      }
    }
  }
}, 10 * 60 * 1000);

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats,
  redisClient: () => redisClient
};