#!/usr/bin/env node

/**
 * Script de test Firebase pour vérifier la configuration
 * Usage: node scripts/test-firebase.js
 */

require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const logger = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

async function main() {
  console.log(`${colors.bright}${colors.cyan}
🔥 TEST FIREBASE CONFIGURATION
${colors.reset}`);

  try {
    logger.title('1. Test des variables d\'environnement');

    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'NOTIFICATIONS_ENABLED'
    ];

    const missingVars = [];

    for (const varName of requiredVars) {
      if (process.env[varName]) {
        logger.success(`${varName}: ${process.env[varName]}`);
      } else {
        logger.error(`${varName}: Non défini`);
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      logger.error(`Variables manquantes: ${missingVars.join(', ')}`);
      process.exit(1);
    }

    logger.title('2. Test du module Firebase Admin');

    try {
      const admin = require('firebase-admin');
      logger.success('Module firebase-admin chargé');
    } catch (error) {
      logger.error('Module firebase-admin manquant:', error.message);
      logger.info('Installez avec: npm install firebase-admin');
      process.exit(1);
    }

    logger.title('3. Test de la configuration Firebase');

    try {
      const firebaseConfig = require('../src/config/firebase');
      
      if (firebaseConfig.isFirebaseAvailable()) {
        logger.success('Firebase Admin SDK configuré');
        
        const app = firebaseConfig.getFirebaseApp();
        if (app) {
          logger.success(`Projet Firebase: ${app.options.projectId}`);
        }

        const messaging = firebaseConfig.getMessaging();
        if (messaging) {
          logger.success('Firebase Cloud Messaging disponible');
        }

      } else {
        logger.warning('Firebase non disponible (mode développement)');
        logger.info('Pour activer Firebase:');
        logger.info('1. Configurez FIREBASE_PROJECT_ID dans .env');
        logger.info('2. Ajoutez firebase-service-account.json');
        logger.info('3. Mettez NOTIFICATIONS_ENABLED=true');
      }
    } catch (error) {
      logger.error('Erreur de configuration Firebase:', error.message);
      
      if (error.message.includes('service account')) {
        logger.info('Solution: Créez le fichier firebase-service-account.json');
        logger.info('Ou configurez les variables FIREBASE_* dans .env');
      }
    }

    logger.title('4. Test d\'envoi de notification (simulation)');

    try {
      // Token de test (pas un vrai token FCM)
      const testToken = 'test-fcm-token-' + Date.now();
      
      const mobilePushService = require('../src/services/mobilePushService');
      
      // Test de validation de token
      const isValidToken = require('../src/config/firebase').isValidFCMToken(testToken);
      logger.info(`Validation token test: ${isValidToken ? 'Valide' : 'Invalide'} (attendu: Invalide)`);
      
      // Test des templates de notification
      const templates = require('../src/config/firebase').notificationTemplates;
      const templateCount = Object.keys(templates).length;
      logger.success(`${templateCount} templates de notifications chargés`);

      logger.success('Service de notifications push configuré');

    } catch (error) {
      logger.error('Erreur service notifications:', error.message);
    }

    logger.title('5. Résumé de la configuration');

    console.log(`
📊 État de Firebase:
  Project ID: ${process.env.FIREBASE_PROJECT_ID || 'Non configuré'}
  Notifications: ${process.env.NOTIFICATIONS_ENABLED === 'true' ? '✅ Activées' : '❌ Désactivées'}
  Service Account: ${require('fs').existsSync('./firebase-service-account.json') ? '✅ Présent' : '❌ Manquant'}
  
🔧 Actions recommandées:
${!process.env.FIREBASE_PROJECT_ID ? '  • Configurer FIREBASE_PROJECT_ID dans .env\n' : ''}
${!require('fs').existsSync('./firebase-service-account.json') ? '  • Ajouter firebase-service-account.json\n' : ''}
${process.env.NOTIFICATIONS_ENABLED !== 'true' ? '  • Activer NOTIFICATIONS_ENABLED=true\n' : ''}
${process.env.FIREBASE_PROJECT_ID && require('fs').existsSync('./firebase-service-account.json') && process.env.NOTIFICATIONS_ENABLED === 'true' 
  ? '  ✅ Configuration complète! Prêt pour les notifications push.' 
  : '  ⚠️ Configuration incomplète.'}

📚 Documentation:
  • Guide complet: docs/FIREBASE_SETUP_GUIDE.md
  • Configuration: scripts/firebase-setup.js
    `);

  } catch (error) {
    logger.error('Erreur lors du test:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}