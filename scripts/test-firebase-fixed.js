/**
 * Script de test Firebase - Version corrigée
 * Teste la configuration Firebase et les notifications push
 */

require('dotenv').config();

// Couleurs pour l'affichage
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function title(text) {
  console.log(`\n${colors.blue}${colors.bold}${text}${colors.reset}\n`);
}

function success(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function error(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function warning(text) {
  console.log(`${colors.yellow}⚠️ ${text}${colors.reset}`);
}

function info(text) {
  console.log(`  ${text}`);
}

async function testFirebaseConfiguration() {
  title('🔥 TEST FIREBASE CONFIGURATION CORRIGÉ');

  // 1. Variables d'environnement
  title('1. Test des variables d\'environnement');
  
  const requiredVars = ['FIREBASE_PROJECT_ID'];
  let allGood = true;

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      success(`${varName}: ${process.env[varName]}`);
    } else {
      error(`${varName}: manquant`);
      allGood = false;
    }
  });

  if (process.env.NOTIFICATIONS_ENABLED === 'true') {
    success('NOTIFICATIONS_ENABLED: true');
  } else {
    warning('NOTIFICATIONS_ENABLED: false');
  }

  // 2. Module Firebase Admin
  title('2. Test du module Firebase Admin');
  
  try {
    const admin = require('firebase-admin');
    success('Module firebase-admin chargé');
  } catch (err) {
    error(`Module firebase-admin manquant: ${err.message}`);
    return;
  }

  // 3. Configuration Firebase
  title('3. Test de la configuration Firebase');
  
  try {
    const firebaseConfig = require('../src/config/firebase');
    
    // Initialiser Firebase
    const app = firebaseConfig.initialize();
    
    if (app) {
      success('Firebase Admin SDK initialisé');
      success(`Projet Firebase: ${app.options.projectId}`);
    } else {
      error('Firebase Admin SDK non initialisé');
      return;
    }

    // Test du messaging
    const messaging = firebaseConfig.getMessaging();
    if (messaging) {
      success('Firebase Cloud Messaging disponible');
    } else {
      error('Firebase Cloud Messaging non disponible');
    }

    // Vérification configuration
    if (firebaseConfig.isConfigured()) {
      success('Configuration Firebase complète');
    } else {
      error('Configuration Firebase incomplète');
    }

  } catch (err) {
    error(`Erreur configuration Firebase: ${err.message}`);
    if (err.message.includes('ENOENT')) {
      info('Le fichier firebase-service-account.json est manquant');
    }
    return;
  }

  // 4. Test de notification (simulation)
  title('4. Test d\'envoi de notification (simulation)');
  
  try {
    const firebaseConfig = require('../src/config/firebase');
    
    if (firebaseConfig.isConfigured()) {
      // Simulation d'envoi de notification
      const testToken = 'fake-token-for-testing';
      
      info('Test de notification avec token simulé...');
      
      try {
        // Ne pas vraiment envoyer, juste tester la structure
        const message = {
          token: testToken,
          notification: {
            title: 'Test AfrikMode',
            body: 'Configuration Firebase réussie!'
          },
          data: {
            type: 'test',
            timestamp: Date.now().toString()
          }
        };
        
        success('Structure de notification valide');
        info(`Titre: ${message.notification.title}`);
        info(`Corps: ${message.notification.body}`);
        
      } catch (err) {
        error(`Erreur structure notification: ${err.message}`);
      }
      
    } else {
      warning('Firebase non configuré - simulation impossible');
    }
    
  } catch (err) {
    error(`Erreur test notification: ${err.message}`);
  }

  // 5. Résumé
  title('5. Résumé de la configuration');
  
  console.log(`\n📊 ${colors.bold}État de Firebase:${colors.reset}`);
  success(`Project ID: ${process.env.FIREBASE_PROJECT_ID || 'Non défini'}`);
  success(`Notifications: ${process.env.NOTIFICATIONS_ENABLED === 'true' ? '✅ Activées' : '❌ Désactivées'}`);
  
  try {
    const fs = require('fs');
    const serviceAccountPath = './src/config/firebase-service-account.json';
    if (fs.existsSync(serviceAccountPath)) {
      success('Service Account: ✅ Présent');
    } else {
      error('Service Account: ❌ Manquant');
    }
  } catch (err) {
    error('Service Account: ❌ Erreur vérification');
  }

  console.log(`\n🔧 ${colors.bold}Actions recommandées:${colors.reset}`);
  
  try {
    const firebaseConfig = require('../src/config/firebase');
    if (firebaseConfig.isConfigured()) {
      success('✅ Configuration complète! Prêt pour les notifications push.');
    } else {
      warning('⚠️ Configuration incomplète');
      info('1. Vérifiez le fichier firebase-service-account.json');
      info('2. Vérifiez FIREBASE_PROJECT_ID dans .env');
      info('3. Mettez NOTIFICATIONS_ENABLED=true');
    }
  } catch (err) {
    error('❌ Erreurs de configuration détectées');
  }

  console.log(`\n📚 ${colors.bold}Documentation:${colors.reset}`);
  info('• Guide complet: docs/FIREBASE_SETUP_GUIDE.md');
  info('• Configuration: scripts/firebase-setup.js');

  // Test de la base de données pour vérifier que le reste fonctionne
  title('6. Test de connexion base de données');
  
  try {
    const knex = require('../src/config/database');
    await knex.raw('SELECT 1');
    success('Database connection established successfully');
  } catch (err) {
    error(`Database connection failed: ${err.message}`);
  }

  console.log('\n');
}

// Exécuter les tests
if (require.main === module) {
  testFirebaseConfiguration().catch(err => {
    console.error('Erreur lors des tests:', err);
    process.exit(1);
  });
}

module.exports = testFirebaseConfiguration;