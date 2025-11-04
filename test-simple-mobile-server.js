const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Configuration minimale pour test
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mock middleware d'authentification
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
};

// Mock middleware optionnel
const optional = (req, res, next) => next();

// Routes de base
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'AfrikMode API Test Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test des routes mobiles simplifiées
const router = express.Router();

// Test simple des routes mobiles
router.get('/.well-known/apple-app-site-association', (req, res) => {
  res.json({
    applinks: {
      apps: [],
      details: [{
        appID: "TEAM_ID.com.afrikmode.app",
        paths: ["/l/*", "/app/*", "/product/*", "/store/*"]
      }]
    }
  });
});

router.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.afrikmode.android",
      sha256_cert_fingerprints: ["SHA256_FINGERPRINT_HERE"]
    }
  }]);
});

router.get('/stats', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      pushNotifications: {
        sent: 0,
        delivered: 0,
        clicked: 0,
        deliveryRate: 0,
        clickRate: 0
      },
      deepLinks: {
        created: 0,
        clicked: 0,
        conversions: 0,
        conversionRate: 0
      },
      offlineCache: {
        totalCacheSize: "0MB",
        activeUsers: 0,
        syncOperations: 0,
        syncSuccessRate: 0
      }
    }
  });
});

app.use('/api/mobile', router);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🧪 Test Server running on http://localhost:${PORT}`);
  console.log('  GET  /health');
  console.log('  GET  /api/mobile/.well-known/apple-app-site-association');
  console.log('  GET  /api/mobile/.well-known/assetlinks.json');
  console.log('  GET  /api/mobile/stats');
});

module.exports = app;