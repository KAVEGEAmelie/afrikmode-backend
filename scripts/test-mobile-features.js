#!/usr/bin/env node

/**
 * Script de test pour les fonctionnalités mobiles
 * Usage: node scripts/test-mobile-features.js
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
let authToken = null;

// Codes couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Logger avec couleurs
 */
const logger = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}🎯 ${msg}${colors.reset}\n`)
};

/**
 * Fonction pour poser une question
 */
function question(prompt) {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}?${colors.reset} ${prompt}: `, resolve);
  });
}

/**
 * Client API avec gestion des erreurs
 */
class APIClient {
  constructor(baseURL, token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  setToken(token) {
    this.token = token;
  }
}

/**
 * Test de connexion et authentification
 */
async function testAuthentication(client) {
  logger.title('Test d\'authentification');

  // Test de santé de l'API
  logger.info('Test de connexion à l\'API...');
  const healthCheck = await client.get('/health');
  
  if (!healthCheck.success) {
    logger.error('Impossible de se connecter à l\'API');
    logger.error(JSON.stringify(healthCheck.error, null, 2));
    return false;
  }

  logger.success('API accessible');

  // Authentification
  const email = await question('Email de test');
  const password = await question('Mot de passe');

  logger.info('Tentative d\'authentification...');
  const login = await client.post('/auth/login', { email, password });

  if (!login.success) {
    logger.error('Échec de l\'authentification');
    logger.error(JSON.stringify(login.error, null, 2));
    return false;
  }

  const token = login.data.data.token;
  client.setToken(token);
  logger.success('Authentification réussie');
  
  return true;
}

/**
 * Test des notifications push
 */
async function testPushNotifications(client) {
  logger.title('Test des notifications push');

  // Génération d'un token FCM factice pour les tests
  const testToken = `test_fcm_token_${Date.now()}`;

  // Test d'enregistrement de token
  logger.info('Test d\'enregistrement de token FCM...');
  const registerResult = await client.post('/mobile/push/register', {
    token: testToken,
    deviceInfo: {
      platform: 'android',
      appVersion: '1.0.0',
      deviceId: 'test-device-123',
      model: 'Test Device'
    }
  });

  if (registerResult.success) {
    logger.success('Token FCM enregistré avec succès');
  } else {
    logger.error('Erreur lors de l\'enregistrement du token');
    logger.error(JSON.stringify(registerResult.error, null, 2));
  }

  // Test de notification de test
  logger.info('Test d\'envoi de notification...');
  const testNotification = await client.post('/mobile/push/test', {
    title: 'Test Notification',
    body: 'Ceci est une notification de test depuis le script',
    data: {
      type: 'test',
      timestamp: new Date().toISOString()
    }
  });

  if (testNotification.success) {
    logger.success('Notification de test envoyée');
  } else {
    logger.error('Erreur lors de l\'envoi de la notification');
    logger.error(JSON.stringify(testNotification.error, null, 2));
  }

  // Test de notification contextuelle
  logger.info('Test de notification contextuelle...');
  const contextualNotification = await client.post('/mobile/push/contextual', {
    notificationType: 'product_back_in_stock',
    context: {
      productId: 'test-product-id',
      productName: 'T-shirt Wax Élégant',
      price: 29.99
    }
  });

  if (contextualNotification.success) {
    logger.success('Notification contextuelle envoyée');
  } else {
    logger.error('Erreur lors de l\'envoi de la notification contextuelle');
    logger.error(JSON.stringify(contextualNotification.error, null, 2));
  }

  // Test de suppression de token
  logger.info('Test de suppression de token FCM...');
  const unregisterResult = await client.post('/mobile/push/unregister', {
    token: testToken
  });

  if (unregisterResult.success) {
    logger.success('Token FCM supprimé avec succès');
  } else {
    logger.error('Erreur lors de la suppression du token');
    logger.error(JSON.stringify(unregisterResult.error, null, 2));
  }
}

/**
 * Test des deep links
 */
async function testDeepLinks(client) {
  logger.title('Test des deep links');

  // Test de création de deep link produit
  logger.info('Test de création de deep link produit...');
  const productLink = await client.post('/mobile/deeplink/create', {
    type: 'product',
    targetId: 'test-product-id',
    options: {
      campaign: 'test_campaign',
      utm_source: 'script_test',
      utm_medium: 'automated_test'
    }
  });

  let shortCode = null;
  if (productLink.success) {
    logger.success('Deep link produit créé avec succès');
    shortCode = productLink.data.data.shortCode;
    logger.info(`Short code: ${shortCode}`);
    logger.info(`URL courte: ${productLink.data.data.shortUrl}`);
  } else {
    logger.error('Erreur lors de la création du deep link');
    logger.error(JSON.stringify(productLink.error, null, 2));
  }

  // Test de création de deep link magasin
  logger.info('Test de création de deep link magasin...');
  const storeLink = await client.post('/mobile/deeplink/create', {
    type: 'store',
    targetId: 'test-store-id',
    options: {
      campaign: 'store_sharing'
    }
  });

  if (storeLink.success) {
    logger.success('Deep link magasin créé avec succès');
    logger.info(`URL courte: ${storeLink.data.data.shortUrl}`);
  } else {
    logger.error('Erreur lors de la création du deep link magasin');
    logger.error(JSON.stringify(storeLink.error, null, 2));
  }

  // Test de résolution de lien court
  if (shortCode) {
    logger.info('Test de résolution du lien court...');
    const resolution = await client.get(`/mobile/l/${shortCode}`);
    
    if (resolution.success || resolution.status === 302) {
      logger.success('Lien court résolu (redirection attendue)');
    } else {
      logger.error('Erreur lors de la résolution du lien court');
      logger.error(JSON.stringify(resolution.error, null, 2));
    }
  }
}

/**
 * Test du cache hors ligne
 */
async function testOfflineCache(client) {
  logger.title('Test du cache hors ligne');

  // Test de mise en cache des produits
  logger.info('Test de mise en cache des produits...');
  const cacheProducts = await client.post('/mobile/offline/cache', {
    dataType: 'products',
    options: {
      limit: 10,
      category: 'clothing',
      includeImages: true
    }
  });

  if (cacheProducts.success) {
    logger.success('Produits mis en cache avec succès');
    logger.info(`Clé de cache: ${cacheProducts.data.data.cacheKey}`);
    logger.info(`Taille des données: ${cacheProducts.data.data.dataSize} bytes`);
  } else {
    logger.error('Erreur lors de la mise en cache des produits');
    logger.error(JSON.stringify(cacheProducts.error, null, 2));
  }

  // Test de mise en cache des catégories
  logger.info('Test de mise en cache des catégories...');
  const cacheCategories = await client.post('/mobile/offline/cache', {
    dataType: 'categories'
  });

  if (cacheCategories.success) {
    logger.success('Catégories mises en cache avec succès');
  } else {
    logger.error('Erreur lors de la mise en cache des catégories');
    logger.error(JSON.stringify(cacheCategories.error, null, 2));
  }

  // Test de récupération du cache
  logger.info('Test de récupération du cache produits...');
  const getCached = await client.get('/mobile/offline/cache/products');

  if (getCached.success) {
    logger.success('Cache produits récupéré avec succès');
    logger.info(`Nombre de produits en cache: ${getCached.data.data.products?.length || 0}`);
  } else {
    logger.error('Erreur lors de la récupération du cache');
    logger.error(JSON.stringify(getCached.error, null, 2));
  }

  // Test de synchronisation des changements
  logger.info('Test de synchronisation des changements hors ligne...');
  const syncChanges = await client.post('/mobile/offline/sync', {
    changes: [
      {
        id: `change-${Date.now()}`,
        type: 'wishlist_add',
        data: {
          productId: 'test-product-id'
        },
        timestamp: new Date().toISOString()
      },
      {
        id: `change-${Date.now() + 1}`,
        type: 'profile_update',
        data: {
          firstName: 'Test Updated'
        },
        timestamp: new Date().toISOString()
      }
    ]
  });

  if (syncChanges.success) {
    logger.success('Synchronisation des changements réussie');
    logger.info(`Résultats: ${JSON.stringify(syncChanges.data.data.syncResults, null, 2)}`);
  } else {
    logger.error('Erreur lors de la synchronisation');
    logger.error(JSON.stringify(syncChanges.error, null, 2));
  }

  // Test de préparation de données hors ligne
  logger.info('Test de préparation de données hors ligne...');
  const prepareOffline = await client.post('/mobile/offline/prepare', {
    preferences: {
      includeProducts: true,
      includeStores: false,
      productLimit: 20,
      includeImages: true,
      priceRange: {
        min: 10,
        max: 100
      }
    }
  });

  if (prepareOffline.success) {
    logger.success('Préparation hors ligne réussie');
    logger.info(`Taille du cache: ${prepareOffline.data.data.cacheSize}`);
  } else {
    logger.error('Erreur lors de la préparation hors ligne');
    logger.error(JSON.stringify(prepareOffline.error, null, 2));
  }

  // Test de nettoyage du cache
  logger.info('Test de nettoyage du cache...');
  const clearCache = await client.post('/mobile/offline/clear', {
    dataTypes: ['products']
  });

  if (clearCache.success) {
    logger.success('Cache nettoyé avec succès');
  } else {
    logger.error('Erreur lors du nettoyage du cache');
    logger.error(JSON.stringify(clearCache.error, null, 2));
  }
}

/**
 * Test des statistiques
 */
async function testStatistics(client) {
  logger.title('Test des statistiques mobiles');

  logger.info('Récupération des statistiques...');
  const stats = await client.get('/mobile/stats?days=7');

  if (stats.success) {
    logger.success('Statistiques récupérées avec succès');
    console.log(JSON.stringify(stats.data.data, null, 2));
  } else {
    logger.error('Erreur lors de la récupération des statistiques');
    logger.error(JSON.stringify(stats.error, null, 2));
  }
}

/**
 * Test de configuration des App Links
 */
async function testAppLinksConfig(client) {
  logger.title('Test de configuration des App Links');

  // Test Apple App Site Association
  logger.info('Test de la configuration Universal Links (iOS)...');
  const appleConfig = await client.get('/mobile/.well-known/apple-app-site-association');

  if (appleConfig.success) {
    logger.success('Configuration Universal Links récupérée');
    logger.info('Configuration:', JSON.stringify(appleConfig.data, null, 2));
  } else {
    logger.error('Erreur lors de la récupération de la configuration Universal Links');
    logger.error(JSON.stringify(appleConfig.error, null, 2));
  }

  // Test Android Asset Links
  logger.info('Test de la configuration App Links (Android)...');
  const androidConfig = await client.get('/mobile/.well-known/assetlinks.json');

  if (androidConfig.success) {
    logger.success('Configuration App Links récupérée');
    logger.info('Configuration:', JSON.stringify(androidConfig.data, null, 2));
  } else {
    logger.error('Erreur lors de la récupération de la configuration App Links');
    logger.error(JSON.stringify(androidConfig.error, null, 2));
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(`${colors.bright}${colors.magenta}
┌─────────────────────────────────────────────────────┐
│                                                     │
│  📱 TESTS DES FONCTIONNALITÉS MOBILES AFRIKMODE     │
│                                                     │
│  Ce script teste toutes les fonctionnalités         │
│  mobiles de l'API AfrikMode                         │
│                                                     │
└─────────────────────────────────────────────────────┘
${colors.reset}`);

  const client = new APIClient(API_BASE_URL);

  try {
    // Test de l'authentification
    const authSuccess = await testAuthentication(client);
    if (!authSuccess) {
      logger.error('Impossible de continuer sans authentification');
      process.exit(1);
    }

    // Tests des fonctionnalités mobiles
    await testPushNotifications(client);
    await testDeepLinks(client);
    await testOfflineCache(client);
    await testStatistics(client);
    await testAppLinksConfig(client);

    logger.title('🎉 Tests terminés avec succès!');
    
  } catch (error) {
    logger.error('Erreur lors des tests:', error.message);
    console.error(error);
  } finally {
    rl.close();
  }
}

// Gestion des signaux de sortie
process.on('SIGINT', () => {
  logger.warning('\nTests interrompus par l\'utilisateur');
  rl.close();
  process.exit(0);
});

// Lancement du script
if (require.main === module) {
  main();
}

module.exports = {
  testAuthentication,
  testPushNotifications,
  testDeepLinks,
  testOfflineCache,
  testStatistics,
  testAppLinksConfig
};