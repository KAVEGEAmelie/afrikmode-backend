const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/config/database');
const redis = require('../../src/config/redis');

describe('Mobile Features API', () => {
  let authToken;
  let testUser;
  let testProduct;
  let testStore;

  beforeAll(async () => {
    // Créer un utilisateur de test et obtenir le token d'authentification
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Mobile',
        lastName: 'Testeur',
        email: 'mobile.test@example.com',
        password: 'MobileTest123!',
        phone: '+1234567890'
      });

    testUser = registerResponse.body.data.user;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mobile.test@example.com',
        password: 'MobileTest123!'
      });

    authToken = loginResponse.body.data.token;

    // Créer un magasin de test
    const storeResponse = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Mobile Store',
        description: 'Magasin pour tester les fonctionnalités mobiles',
        category: 'fashion',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          postalCode: '12345',
          country: 'TestLand'
        }
      });

    testStore = storeResponse.body.data;

    // Créer un produit de test
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Produit Mobile Test',
        description: 'Produit pour tester le deep linking',
        price: 29.99,
        currency: 'EUR',
        storeId: testStore.id,
        category: 'clothing',
        images: ['https://example.com/image1.jpg'],
        inStock: true,
        stockQuantity: 50
      });

    testProduct = productResponse.body.data;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await db('offline_sync_queue').where('user_id', testUser.id).del();
    await db('offline_cache_logs').where('user_id', testUser.id).del();
    await db('push_notification_logs').where('user_id', testUser.id).del();
    await db('deep_link_clicks').where('user_id', testUser.id).del();
    await db('deep_links').where('created_by', testUser.id).del();
    await db('device_tokens').where('user_id', testUser.id).del();
    await db('mobile_user_preferences').where('user_id', testUser.id).del();
    
    // Nettoyer Redis
    const cacheKeys = await redis.keys(`offline:${testUser.id}:*`);
    if (cacheKeys.length > 0) {
      await redis.del(...cacheKeys);
    }
    
    await db.destroy();
    await redis.disconnect();
  });

  describe('Push Notifications', () => {
    const testFCMToken = 'test-fcm-token-' + Date.now();

    test('should register FCM token', async () => {
      const response = await request(app)
        .post('/api/mobile/push/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: testFCMToken,
          deviceInfo: {
            platform: 'android',
            appVersion: '1.0.0',
            deviceId: 'test-device-123',
            model: 'Test Phone'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Token enregistré');
    });

    test('should not register invalid FCM token', async () => {
      const response = await request(app)
        .post('/api/mobile/push/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'invalid-short-token',
          deviceInfo: {
            platform: 'ios'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should unregister FCM token', async () => {
      const response = await request(app)
        .post('/api/mobile/push/unregister')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: testFCMToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Token supprimé');
    });

    test('should send test notification', async () => {
      // D'abord réenregistrer le token
      await request(app)
        .post('/api/mobile/push/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: testFCMToken,
          deviceInfo: { platform: 'android' }
        });

      const response = await request(app)
        .post('/api/mobile/push/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Notification',
          body: 'Ceci est un test de notification push',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should send contextual notification', async () => {
      const response = await request(app)
        .post('/api/mobile/push/contextual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationType: 'product_back_in_stock',
          context: {
            productId: testProduct.id,
            productName: testProduct.name,
            price: testProduct.price
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Deep Linking', () => {
    let testDeepLink;

    test('should create product deep link', async () => {
      const response = await request(app)
        .post('/api/mobile/deeplink/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'product',
          targetId: testProduct.id,
          options: {
            campaign: 'mobile_test',
            utm_source: 'jest_test',
            utm_medium: 'api_test'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('shortUrl');
      expect(response.body.data).toHaveProperty('shortCode');
      expect(response.body.data.shortCode).toMatch(/^[a-zA-Z0-9]{6,10}$/);

      testDeepLink = response.body.data;
    });

    test('should create store deep link', async () => {
      const response = await request(app)
        .post('/api/mobile/deeplink/create')
        .send({
          type: 'store',
          targetId: testStore.id,
          options: {
            campaign: 'store_sharing'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('shortUrl');
    });

    test('should resolve short link', async () => {
      const response = await request(app)
        .get(`/api/mobile/l/${testDeepLink.shortCode}`)
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBeDefined();
    });

    test('should handle invalid short code', async () => {
      const response = await request(app)
        .get('/api/mobile/l/invalid123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should not create deep link for non-existent resource', async () => {
      const response = await request(app)
        .post('/api/mobile/deeplink/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'product',
          targetId: '00000000-0000-0000-0000-000000000000'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Offline Caching', () => {
    test('should cache products for offline use', async () => {
      const response = await request(app)
        .post('/api/mobile/offline/cache')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataType: 'products',
          options: {
            limit: 10,
            category: 'clothing',
            includeImages: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cacheKey');
      expect(response.body.data).toHaveProperty('dataSize');
    });

    test('should cache categories for offline use', async () => {
      const response = await request(app)
        .post('/api/mobile/offline/cache')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataType: 'categories'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should retrieve cached data', async () => {
      const response = await request(app)
        .get('/api/mobile/offline/cache/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('cacheInfo');
    });

    test('should prepare offline data with preferences', async () => {
      const response = await request(app)
        .post('/api/mobile/offline/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: {
            includeProducts: true,
            includeStores: false,
            productLimit: 25,
            includeImages: true,
            priceRange: {
              min: 10,
              max: 100
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cacheSize');
    });

    test('should sync offline changes', async () => {
      const changes = [
        {
          id: 'change-1',
          type: 'wishlist_add',
          data: {
            productId: testProduct.id
          },
          timestamp: new Date().toISOString()
        },
        {
          id: 'change-2',
          type: 'profile_update',
          data: {
            firstName: 'Mobile Updated'
          },
          timestamp: new Date().toISOString()
        }
      ];

      const response = await request(app)
        .post('/api/mobile/offline/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ changes });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('syncResults');
      expect(response.body.data.syncResults).toHaveLength(2);
    });

    test('should clear cache', async () => {
      const response = await request(app)
        .post('/api/mobile/offline/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataTypes: ['products']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Mobile Statistics', () => {
    test('should get mobile usage statistics', async () => {
      const response = await request(app)
        .get('/api/mobile/stats?days=7')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pushNotifications');
      expect(response.body.data).toHaveProperty('deepLinks');
      expect(response.body.data).toHaveProperty('offlineCache');
    });
  });

  describe('App Links Configuration', () => {
    test('should return Apple App Site Association', async () => {
      const response = await request(app)
        .get('/api/mobile/.well-known/apple-app-site-association');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('applinks');
      expect(response.body.applinks).toHaveProperty('apps');
      expect(response.body.applinks).toHaveProperty('details');
    });

    test('should return Android Asset Links', async () => {
      const response = await request(app)
        .get('/api/mobile/.well-known/assetlinks.json');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('relation');
      expect(response.body[0]).toHaveProperty('target');
    });
  });

  describe('Authentication & Validation', () => {
    test('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .post('/api/mobile/push/register')
        .send({
          token: 'test-token',
          deviceInfo: { platform: 'ios' }
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/mobile/deeplink/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'product'
          // manque targetId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate enum values', async () => {
      const response = await request(app)
        .post('/api/mobile/offline/cache')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataType: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});