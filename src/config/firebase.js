/**
 * Configuration Firebase pour les notifications push
 * Configure Firebase Admin SDK pour l'envoi de notifications
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseConfig {
  
  constructor() {
    this.app = null;
    this.messaging = null;
    this.initialized = false;
  }

  /**
   * Initialiser Firebase Admin SDK
   */
  initialize() {
    try {
      if (this.initialized) {
        return this.app;
      }

      let serviceAccount = null;

      // Méthode 1: Variable d'environnement avec JSON
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          console.log('✅ Configuration Firebase chargée depuis variable d\'environnement');
        } catch (error) {
          console.warn('⚠️ Erreur parsing FIREBASE_SERVICE_ACCOUNT:', error.message);
        }
      }

      // Méthode 2: Fichier de configuration
      if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
          const configPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
          serviceAccount = require(configPath);
          console.log('✅ Configuration Firebase chargée depuis fichier');
        } catch (error) {
          console.warn('⚠️ Impossible de charger le fichier de configuration Firebase:', error.message);
        }
      }

      // Méthode 3: Fichier par défaut dans config/
      if (!serviceAccount) {
        try {
          const defaultPath = path.join(__dirname, 'firebase-service-account.json');
          serviceAccount = require(defaultPath);
          console.log('✅ Configuration Firebase chargée depuis fichier par défaut');
        } catch (error) {
          console.warn('⚠️ Fichier service account par défaut non trouvé:', error.message);
        }
      }

      // Méthode 4: Variables d'environnement séparées
      if (!serviceAccount) {
        if (process.env.FIREBASE_PROJECT_ID && 
            process.env.FIREBASE_CLIENT_EMAIL && 
            process.env.FIREBASE_PRIVATE_KEY) {
          
          serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
          };
          console.log('✅ Configuration Firebase construite depuis variables d\'environnement');
        }
      }

      if (!serviceAccount) {
        console.warn('⚠️ Aucune configuration Firebase trouvée - Notifications push désactivées');
        return null;
      }

      // Initialiser Firebase Admin
      if (!admin.apps.length) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      } else {
        this.app = admin.apps[0];
      }

      this.messaging = admin.messaging();
      this.initialized = true;

      console.log(`✅ Firebase Admin SDK initialisé pour le projet: ${serviceAccount.project_id}`);
      return this.app;

    } catch (error) {
      console.error('❌ Erreur initialisation Firebase:', error);
      return null;
    }
  }

  /**
   * Obtenir l'instance Firebase Messaging
   */
  getMessaging() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.messaging;
  }

  /**
   * Vérifier si Firebase est configuré
   */
  isConfigured() {
    return this.initialized && this.messaging !== null;
  }

  /**
   * Valider un token FCM
   */
  async validateToken(token) {
    try {
      if (!this.isConfigured()) {
        return false;
      }

      // Essayer d'envoyer un message de test (dry run)
      const message = {
        token: token,
        data: { test: 'true' }
      };

      await this.messaging.send(message, true); // dry run
      return true;

    } catch (error) {
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Nettoyer les tokens invalides
   */
  async cleanupInvalidTokens(tokens) {
    try {
      if (!this.isConfigured() || !tokens.length) {
        return { validTokens: tokens, invalidTokens: [] };
      }

      const validTokens = [];
      const invalidTokens = [];

      // Tester les tokens par batch
      for (const token of tokens) {
        try {
          const isValid = await this.validateToken(token);
          if (isValid) {
            validTokens.push(token);
          } else {
            invalidTokens.push(token);
          }
        } catch (error) {
          console.warn(`⚠️ Erreur validation token: ${error.message}`);
          invalidTokens.push(token);
        }
      }

      return { validTokens, invalidTokens };

    } catch (error) {
      console.error('❌ Erreur nettoyage tokens:', error);
      return { validTokens: tokens, invalidTokens: [] };
    }
  }

}

// Singleton
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;