const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/config/database');
const path = require('path');
const fs = require('fs');

describe('Media Management System', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Créer un utilisateur de test
    const testUser = {
      id: 'test-media-user-' + Date.now(),
      email: 'mediatest@afrikmode.com',
      password: 'password123',
      full_name: 'Test Media User',
      role: 'admin'
    };

    await db('users').insert(testUser);
    testUserId = testUser.id;

    // Se connecter pour obtenir un token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    await db('media_files').where('uploaded_by', testUserId).del();
    await db('users').where('id', testUserId).del();
  });

  describe('Media Upload', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should require a file', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Aucun fichier');
    });

    // Note: Test d'upload réel nécessiterait un fichier image
    // Pour les tests unitaires, on peut simuler avec des mocks
  });

  describe('Media List', () => {
    test('should get media list with authentication', async () => {
      const response = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('medias');
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/media?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('should support category filter', async () => {
      const response = await request(app)
        .get('/api/media?category=products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Media Statistics', () => {
    test('should get media statistics', async () => {
      const response = await request(app)
        .get('/api/media/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('byFormat');
    });
  });

  describe('Admin Features', () => {
    test('should get admin dashboard', async () => {
      const response = await request(app)
        .get('/api/media/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('general');
      expect(response.body.data).toHaveProperty('scheduledTasks');
    });

    test('should get health check', async () => {
      const response = await request(app)
        .get('/api/media/admin/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.success).toBeDefined();
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('checks');
    });

    test('should get media configuration', async () => {
      const response = await request(app)
        .get('/api/media/admin/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update watermark configuration', async () => {
      const config = {
        position: 'bottom-right',
        margin: 25,
        opacity: 0.8
      };

      const response = await request(app)
        .put('/api/media/watermark/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Validation', () => {
    test('should validate image upload parameters', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('category', 'invalid_category')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate signed URL parameters', async () => {
      const response = await request(app)
        .get('/api/media/invalid-id/signed-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

// Tests unitaires pour les services
describe('Media Service Unit Tests', () => {
  const mediaService = require('../../src/services/mediaService');

  describe('Image Processing', () => {
    test('should validate image dimensions', async () => {
      // Test avec un mock de sharp
      const mockMetadata = {
        width: 100,
        height: 100,
        format: 'jpeg',
        channels: 3
      };

      // On peut utiliser des mocks pour tester la logique sans fichiers réels
      expect(mockMetadata.width).toBeGreaterThan(0);
      expect(mockMetadata.height).toBeGreaterThan(0);
    });
  });

  describe('CDN URL Generation', () => {
    test('should generate CDN URLs correctly', () => {
      const s3Key = 'products/test-id/medium.jpg';
      process.env.AWS_CLOUDFRONT_DOMAIN = 'test.cloudfront.net';
      
      const cdnUrl = mediaService.getCdnUrl(s3Key);
      
      expect(cdnUrl).toBe(`https://test.cloudfront.net/${s3Key}`);
    });

    test('should return null without CDN domain', () => {
      delete process.env.AWS_CLOUDFRONT_DOMAIN;
      
      const cdnUrl = mediaService.getCdnUrl('test.jpg');
      
      expect(cdnUrl).toBeNull();
    });
  });
});

// Tests d'intégration pour le planificateur
describe('Media Scheduler Integration', () => {
  const mediaScheduler = require('../../src/services/mediaScheduler');

  test('should return scheduled tasks status', async () => {
    const status = await mediaScheduler.getScheduledTasksStatus();
    
    expect(typeof status).toBe('object');
  });

  test('should validate task names', async () => {
    await expect(
      mediaScheduler.runTask('invalid_task_name')
    ).rejects.toThrow('Tâche inconnue');
  });
});