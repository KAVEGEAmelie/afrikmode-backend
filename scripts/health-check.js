#!/usr/bin/env node

/**
 * Script de vérification rapide de tous les services AfrikMode
 * Usage: node scripts/health-check.js
 */

const path = require('path');
require('dotenv').config();

// Couleurs pour les logs
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

const logger = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

/**
 * Vérifications des services
 */
async function healthCheck() {
  console.log(`${colors.bright}${colors.magenta}
┌─────────────────────────────────────────────────────┐
│                                                     │
│           🏥 HEALTH CHECK AFRIKMODE API             │
│                                                     │
│     Vérification de tous les services et           │
│     composants de l'API AfrikMode                   │
│                                                     │
└─────────────────────────────────────────────────────┘
${colors.reset}`);

  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Vérification de la base de données
  logger.title('🗄️ Base de données');
  try {
    const db = require('./src/config/database');
    await db.raw('SELECT 1');
    logger.success('PostgreSQL connecté');
    passedChecks++;
  } catch (error) {
    logger.error('PostgreSQL: ' + error.message);
  }
  totalChecks++;

  // 2. Vérification Redis
  logger.title('📦 Cache Redis');
  try {
    const redis = require('./src/config/redis');
    await redis.ping();
    logger.success('Redis connecté');
    passedChecks++;
  } catch (error) {
    logger.error('Redis: ' + error.message);
  }
  totalChecks++;

  // 3. Vérification Firebase
  logger.title('🔥 Firebase (Push Notifications)');
  try {
    const { isFirebaseAvailable } = require('./src/config/firebase');
    if (isFirebaseAvailable()) {
      logger.success('Firebase configuré');
      passedChecks++;
    } else {
      logger.warning('Firebase non configuré (notifications désactivées)');
    }
  } catch (error) {
    logger.warning('Firebase: ' + error.message);
  }
  totalChecks++;

  // 4. Vérification des services critiques
  logger.title('⚙️ Services critiques');
  
  const services = [
    { name: 'mobilePushService', path: './src/services/mobilePushService' },
    { name: 'deepLinkService', path: './src/services/deepLinkService' },
    { name: 'offlineCacheService', path: './src/services/offlineCacheService' },
    { name: 'emailService', path: './src/services/emailService' },
    { name: 'reportService', path: './src/services/reportService' },
    { name: 'couponService', path: './src/services/couponService' },
    { name: 'referralService', path: './src/services/referralService' },
    { name: 'ticketService', path: './src/services/ticketService' },
    { name: 'mediaService', path: './src/services/mediaService' },
    { name: 'seoService', path: './src/services/seoService' }
  ];

  for (const service of services) {
    try {
      const serviceModule = require(service.path);
      if (serviceModule && typeof serviceModule === 'object') {
        logger.success(`${service.name} chargé`);
        passedChecks++;
      } else {
        logger.error(`${service.name} invalide`);
      }
    } catch (error) {
      logger.error(`${service.name}: ${error.message}`);
    }
    totalChecks++;
  }

  // 5. Vérification des routes
  logger.title('🛣️ Routes API');
  
  const routes = [
    'auth', 'users', 'stores', 'categories', 'products', 'orders', 
    'payments', 'tickets', 'coupons', 'referrals', 'mobile',
    'analytics', 'reports', 'security', 'newsletter', 'media'
  ];

  for (const route of routes) {
    try {
      const routeModule = require(`./src/routes/${route}`);
      if (routeModule && typeof routeModule === 'function') {
        logger.success(`Route ${route} chargée`);
        passedChecks++;
      } else {
        logger.error(`Route ${route} invalide`);
      }
    } catch (error) {
      logger.error(`Route ${route}: ${error.message}`);
    }
    totalChecks++;
  }

  // 6. Vérification des migrations
  logger.title('🔄 Migrations base de données');
  try {
    const knex = require('knex');
    const knexConfig = require('./knexfile');
    const db = knex(knexConfig.development);
    
    const migrations = await db.migrate.currentVersion();
    if (migrations) {
      logger.success(`Migrations à jour (version: ${migrations})`);
      passedChecks++;
    } else {
      logger.warning('Aucune migration détectée');
    }
    await db.destroy();
  } catch (error) {
    logger.error('Migrations: ' + error.message);
  }
  totalChecks++;

  // 7. Vérification variables d'environnement critiques
  logger.title('🔐 Configuration environnement');
  
  const requiredEnvs = [
    'DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET',
    'BCRYPT_ROUNDS', 'SMTP_HOST', 'SMTP_USER'
  ];

  let envCount = 0;
  for (const env of requiredEnvs) {
    if (process.env[env]) {
      envCount++;
    } else {
      logger.warning(`Variable ${env} manquante`);
    }
  }
  
  if (envCount === requiredEnvs.length) {
    logger.success(`Toutes les variables critiques configurées (${envCount}/${requiredEnvs.length})`);
    passedChecks++;
  } else {
    logger.warning(`Variables configurées: ${envCount}/${requiredEnvs.length}`);
  }
  totalChecks++;

  // 8. Vérification structure fichiers
  logger.title('📁 Structure de fichiers');
  
  const criticalFiles = [
    'src/server.js',
    'src/config/database.js',
    'src/config/redis.js',
    'package.json',
    'knexfile.js'
  ];

  const fs = require('fs').promises;
  let fileCount = 0;
  
  for (const file of criticalFiles) {
    try {
      await fs.access(file);
      fileCount++;
    } catch (error) {
      logger.error(`Fichier manquant: ${file}`);
    }
  }
  
  if (fileCount === criticalFiles.length) {
    logger.success(`Tous les fichiers critiques présents (${fileCount}/${criticalFiles.length})`);
    passedChecks++;
  } else {
    logger.error(`Fichiers présents: ${fileCount}/${criticalFiles.length}`);
  }
  totalChecks++;

  // Résultats finaux
  logger.title('📊 Résultats du Health Check');
  
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  
  console.log(`\n${colors.bright}Vérifications passées: ${passedChecks}/${totalChecks} (${percentage}%)${colors.reset}`);
  
  if (percentage >= 90) {
    logger.success(`Système en excellente santé! 🎉`);
    console.log(`${colors.green}${colors.bright}✅ L'API AfrikMode est prête pour le déploiement${colors.reset}\n`);
  } else if (percentage >= 75) {
    logger.warning(`Système fonctionnel avec améliorations nécessaires ⚠️`);
    console.log(`${colors.yellow}${colors.bright}🔧 Quelques corrections recommandées avant production${colors.reset}\n`);
  } else {
    logger.error(`Système nécessite des corrections importantes ❌`);
    console.log(`${colors.red}${colors.bright}🚨 Corrections critiques requises avant déploiement${colors.reset}\n`);
  }

  // Recommandations
  console.log(`${colors.cyan}${colors.bright}📋 Recommandations:${colors.reset}`);
  
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log(`  • Configurer Firebase pour les notifications push`);
  }
  
  if (passedChecks < totalChecks) {
    console.log(`  • Résoudre les ${totalChecks - passedChecks} problème(s) identifié(s)`);
  }
  
  console.log(`  • Lancer les tests: npm test`);
  console.log(`  • Vérifier la documentation: docs/BILAN_COMPLET_API.md`);
  console.log(`  • Configurer les environnements staging/production\n`);

  return percentage >= 75;
}

// Exécution du health check
if (require.main === module) {
  healthCheck()
    .then((healthy) => {
      process.exit(healthy ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Erreur lors du health check:', error.message);
      process.exit(1);
    });
}

module.exports = { healthCheck };