#!/usr/bin/env node

/**
 * Démonstration interactive des notifications push Firebase
 * Usage: node scripts/demo-firebase-notifications.js
 */

require('dotenv').config();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}📱 ${msg}${colors.reset}\n`)
};

function question(prompt) {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}?${colors.reset} ${prompt}: `, resolve);
  });
}

// Exemples de notifications contextuelles
const notificationExamples = {
  order_confirmed: {
    title: 'Commande confirmée ✅',
    body: 'Votre commande #AFM-2024-001 a été confirmée et sera bientôt préparée.',
    data: {
      type: 'order_update',
      orderId: 'AFM-2024-001',
      status: 'confirmed',
      amount: '89.99 €',
      items: 3
    }
  },
  product_back_in_stock: {
    title: 'Produit de nouveau en stock 🔔',
    body: 'Le Boubou Élégant Wax que vous suivez est de nouveau disponible!',
    data: {
      type: 'stock_alert',
      productId: 'PROD-001',
      productName: 'Boubou Élégant Wax',
      price: '45.00 €',
      stock: 12
    }
  },
  price_drop: {
    title: 'Baisse de prix 💰',
    body: 'Dashiki Premium a baissé de prix! Nouveau prix: 29.99€ (-25%)',
    data: {
      type: 'price_alert', 
      productId: 'PROD-002',
      oldPrice: '39.99 €',
      newPrice: '29.99 €',
      discount: '25%'
    }
  },
  store_promotion: {
    title: 'Promotion spéciale 🎁',
    body: 'Boutique Kente propose -20% sur toute la collection automne!',
    data: {
      type: 'promotion',
      storeId: 'STORE-001',
      storeName: 'Boutique Kente',
      discount: '20%',
      validUntil: '2024-10-15'
    }
  }
};

async function main() {
  console.log(`${colors.bright}${colors.magenta}
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  📱 DÉMONSTRATION NOTIFICATIONS PUSH AFRIKMODE           │
│                                                           │
│  Testez les différents types de notifications push       │
│  avec des exemples réalistes pour l'e-commerce           │
│                                                           │
└───────────────────────────────────────────────────────────┘
${colors.reset}`);

  try {
    logger.title('Configuration Firebase');

    // Vérifier la configuration
    const firebaseConfig = require('../src/config/firebase');
    
    if (!firebaseConfig.isFirebaseAvailable()) {
      logger.warning('Firebase non configuré - Mode simulation activé');
      logger.info('Pour tester avec Firebase réel:');
      logger.info('1. Configurez firebase-service-account.json');  
      logger.info('2. Mettez NOTIFICATIONS_ENABLED=true dans .env');
      logger.info('3. Ajoutez votre FIREBASE_PROJECT_ID');
      console.log();
    } else {
      logger.success('Firebase configuré et disponible');
      const app = firebaseConfig.getFirebaseApp();
      logger.info(`Projet: ${app.options.projectId}`);
    }

    logger.title('Types de notifications disponibles');

    console.log(`${colors.bright}Choisissez un type de notification:${colors.reset}`);
    const types = Object.keys(notificationExamples);
    types.forEach((type, index) => {
      const example = notificationExamples[type];
      console.log(`${colors.yellow}${index + 1}.${colors.reset} ${colors.bright}${example.title}${colors.reset}`);
      console.log(`   ${example.body}`);
      console.log();
    });

    const choice = await question(`Votre choix (1-${types.length})`);
    const choiceIndex = parseInt(choice) - 1;

    if (choiceIndex < 0 || choiceIndex >= types.length) {
      logger.error('Choix invalide');
      process.exit(1);
    }

    const selectedType = types[choiceIndex];
    const notification = notificationExamples[selectedType];

    logger.title('Configuration de la notification');

    console.log(`${colors.bright}Notification sélectionnée:${colors.reset}`);
    console.log(`${colors.green}Titre:${colors.reset} ${notification.title}`);
    console.log(`${colors.green}Message:${colors.reset} ${notification.body}`);
    console.log(`${colors.green}Données:${colors.reset} ${JSON.stringify(notification.data, null, 2)}`);
    console.log();

    const customTitle = await question(`Personnaliser le titre? (Entrée pour garder l'actuel)`);
    const customBody = await question(`Personnaliser le message? (Entrée pour garder l'actuel)`);

    const finalNotification = {
      title: customTitle || notification.title,
      body: customBody || notification.body,
      data: notification.data
    };

    logger.title('Envoi de la notification');

    try {
      // Token de test pour la démonstration
      const testToken = 'demo-fcm-token-' + Date.now();
      logger.info(`Token de test généré: ${testToken.substring(0, 20)}...`);

      // Simulation d'envoi
      if (firebaseConfig.isFirebaseAvailable()) {
        logger.info('Envoi via Firebase Cloud Messaging...');
        
        // Ici vous pourriez utiliser un vrai token FCM si vous en avez un
        // const result = await mobilePushService.sendNotificationToToken(testToken, finalNotification);
        
        logger.warning('Pas de token FCM réel fourni - Simulation');
      } else {
        logger.info('Mode simulation (Firebase non configuré)');
      }

      // Affichage de la notification comme elle apparaîtrait
      console.log(`\n${colors.bright}${colors.cyan}📱 Aperçu de la notification:${colors.reset}`);
      console.log(`┌${'─'.repeat(50)}┐`);
      console.log(`│ ${colors.bright}${finalNotification.title.padEnd(48)}${colors.reset} │`);
      console.log(`│ ${finalNotification.body.substring(0, 48).padEnd(48)} │`);
      if (finalNotification.body.length > 48) {
        console.log(`│ ${finalNotification.body.substring(48, 96).padEnd(48)} │`);
      }
      console.log(`└${'─'.repeat(50)}┘`);

      logger.success('Notification prête à envoyer!');

      // Statistiques de la démonstration
      logger.title('Statistiques simulées');
      console.log(`${colors.green}✓${colors.reset} Notification créée: ${selectedType}`);
      console.log(`${colors.green}✓${colors.reset} Longueur titre: ${finalNotification.title.length}/50 caractères`);
      console.log(`${colors.green}✓${colors.reset} Longueur message: ${finalNotification.body.length}/100 caractères`);
      console.log(`${colors.green}✓${colors.reset} Données incluses: ${Object.keys(finalNotification.data).length} champs`);

      // Conseils d'optimisation
      console.log(`\n${colors.bright}💡 Conseils d'optimisation:${colors.reset}`);
      
      if (finalNotification.title.length > 40) {
        console.log(`${colors.yellow}⚠${colors.reset} Titre long (${finalNotification.title.length} car.) - Raccourcissez pour mobile`);
      }
      
      if (finalNotification.body.length > 80) {
        console.log(`${colors.yellow}⚠${colors.reset} Message long (${finalNotification.body.length} car.) - Peut être tronqué`);
      }
      
      if (Object.keys(finalNotification.data).length > 5) {
        console.log(`${colors.yellow}⚠${colors.reset} Beaucoup de données - Limitez pour performance`);
      }

      console.log(`${colors.green}✓${colors.reset} Titre optimal (${finalNotification.title.length} ≤ 40 caractères)`);

    } catch (error) {
      logger.error('Erreur lors de l\'envoi:', error.message);
    }

    logger.title('🎉 Démonstration terminée!');

    console.log(`
📱 Prochaines étapes pour production:

1. ${colors.cyan}Configurez Firebase${colors.reset}
   • Créez un projet sur Firebase Console
   • Téléchargez le service account JSON
   • Ajoutez vos apps iOS/Android

2. ${colors.cyan}Intégrez dans vos apps${colors.reset}
   • iOS: Ajoutez GoogleService-Info.plist
   • Android: Ajoutez google-services.json
   • Implémentez la réception des notifications

3. ${colors.cyan}Testez en réel${colors.reset}
   • Obtenez des vrais tokens FCM depuis vos apps
   • Testez l'envoi via l'API AfrikMode
   • Validez l'affichage des notifications

4. ${colors.cyan}Optimisez${colors.reset}
   • Segmentez vos utilisateurs
   • Personnalisez les messages
   • Analysez les taux d'ouverture
    `);

  } catch (error) {
    logger.error('Erreur lors de la démonstration:', error.message);
  } finally {
    rl.close();
  }
}

// Gestion des signaux
process.on('SIGINT', () => {
  logger.warning('\nDémonstration interrompue');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}