const express = require('express');
const router = express.Router();

// Middleware mock pour les tests
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-123' };
  next();
};

const mockOptional = (req, res, next) => next();

const mockValidation = (req, res, next) => next();

// Routes simplifiées pour test
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Routes mobiles fonctionnelles',
    timestamp: new Date().toISOString()
  });
});

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
      pushNotifications: { sent: 0, delivered: 0, clicked: 0 },
      deepLinks: { created: 0, clicked: 0, conversions: 0 },
      offlineCache: { totalCacheSize: "0MB", activeUsers: 0 }
    }
  });
});

// Routes POST simplifiées
router.post('/push/test', mockAuth, mockValidation, (req, res) => {
  res.json({
    success: true,
    message: 'Test notification envoyée (simulation)',
    data: { notificationId: 'test-' + Date.now() }
  });
});

router.post('/deeplink/create', mockOptional, mockValidation, (req, res) => {
  res.json({
    success: true,
    message: 'Deep link créé (simulation)',
    data: {
      shortCode: 'abc123',
      shortUrl: 'https://afkmd.app/l/abc123'
    }
  });
});

router.post('/offline/cache', mockAuth, mockValidation, (req, res) => {
  res.json({
    success: true,
    message: 'Données mises en cache (simulation)',
    data: {
      cacheKey: 'test-cache-key',
      dataSize: 1024
    }
  });
});

module.exports = router;