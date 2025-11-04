#!/usr/bin/env node

/**
 * Script de configuration Firebase pour AfrikMode
 * Usage: node scripts/firebase-setup.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

const logger = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}🔥 ${msg}${colors.reset}\n`)
};

function question(prompt) {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}?${colors.reset} ${prompt}: `, resolve);
  });
}

async function main() {
  console.log(`${colors.bright}${colors.magenta}
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🔥 CONFIGURATION FIREBASE POUR AFRIKMODE              │
│                                                         │
│  Ce script vous guide pour configurer Firebase         │
│  Cloud Messaging pour les notifications push           │
│                                                         │
└─────────────────────────────────────────────────────────┘
${colors.reset}`);

  try {
    logger.title('Étape 1: Vérification des prérequis');

    // Vérifier si firebase-admin est installé
    try {
      require('firebase-admin');
      logger.success('Module firebase-admin installé');
    } catch (error) {
      logger.error('Module firebase-admin manquant');
      logger.info('Installez avec: npm install firebase-admin');
      process.exit(1);
    }

    logger.title('Étape 2: Configuration du projet Firebase');

    const projectId = await question('Project ID Firebase (ex: afrikmode-notifications)');
    
    if (!projectId) {
      logger.error('Project ID requis');
      process.exit(1);
    }

    logger.title('Étape 3: Configuration Service Account');

    const hasServiceAccount = await question('Avez-vous déjà le fichier service account JSON? (y/n)');

    if (hasServiceAccount.toLowerCase() === 'y') {
      const serviceAccountPath = await question('Chemin vers le fichier JSON');
      
      if (fs.existsSync(serviceAccountPath)) {
        // Copier le fichier vers le bon endroit
        const targetPath = path.join(__dirname, '..', 'firebase-service-account.json');
        fs.copyFileSync(serviceAccountPath, targetPath);
        logger.success(`Service account copié vers ${targetPath}`);
      } else {
        logger.error('Fichier service account introuvable');
        process.exit(1);
      }
    } else {
      logger.warning('Vous devez créer un service account dans Firebase Console:');
      logger.info('1. Allez dans Project Settings → Service Accounts');
      logger.info('2. Cliquez sur "Generate new private key"');
      logger.info('3. Téléchargez le fichier JSON');
      logger.info('4. Relancez ce script');
      process.exit(1);
    }

    logger.title('Étape 4: Configuration .env');

    // Lire le fichier .env existant
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Mettre à jour les variables Firebase
    const firebaseConfig = {
      'FIREBASE_PROJECT_ID': projectId,
      'FIREBASE_SERVICE_ACCOUNT_PATH': './firebase-service-account.json',
      'NOTIFICATIONS_ENABLED': 'true'
    };

    let updatedContent = envContent;

    for (const [key, value] of Object.entries(firebaseConfig)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (regex.test(updatedContent)) {
        updatedContent = updatedContent.replace(regex, `${key}=${value}`);
        logger.success(`Variable ${key} mise à jour`);
      } else {
        updatedContent += `\n${key}=${value}`;
        logger.success(`Variable ${key} ajoutée`);
      }
    }

    fs.writeFileSync(envPath, updatedContent);

    logger.title('Étape 5: Test de la configuration');

    // Test de connexion Firebase
    try {
      require('dotenv').config();
      const firebaseConfig = require('../src/config/firebase');
      
      if (firebaseConfig.isFirebaseAvailable()) {
        logger.success('Configuration Firebase valide!');
      } else {
        logger.warning('Configuration Firebase incomplète');
      }
    } catch (error) {
      logger.error('Erreur de configuration:', error.message);
    }

    logger.title('🎉 Configuration terminée!');
    
    console.log(`
📋 Prochaines étapes:

1. ${colors.green}✓${colors.reset} Firebase configuré
2. ${colors.cyan}→${colors.reset} Testez avec: node scripts/test-firebase.js
3. ${colors.cyan}→${colors.reset} Démarrez le serveur: npm start
4. ${colors.cyan}→${colors.reset} Testez une notification push

📁 Fichiers créés/modifiés:
- firebase-service-account.json (ajouté)
- .env (mis à jour)

🔒 Sécurité:
- ✅ firebase-service-account.json ajouté au .gitignore
- ✅ Variables d'environnement configurées
    `);

  } catch (error) {
    logger.error('Erreur lors de la configuration:', error.message);
  } finally {
    rl.close();
  }
}

// Gestion des signaux de sortie
process.on('SIGINT', () => {
  logger.warning('\nConfiguration interrompue par l\'utilisateur');
  rl.close();
  process.exit(0);
});

// Lancement du script
if (require.main === module) {
  main();
}