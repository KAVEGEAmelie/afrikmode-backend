const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./src/config/database');

// Importer le contrôleur réel
const authController = require('./src/controllers/authController');

async function testControllerWithErrorHandling() {
  console.log('🔍 Test du contrôleur avec gestion d\'erreur améliorée...\n');
  
  try {
    const app = express();
    app.use(express.json());
    
    // Créer une requête simulée
    const mockReq = {
      body: {
        email: 'vendor@test.com',
        password: 'AfrikMode2024!',
        rememberMe: false
      },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      },
      originalUrl: '/api/auth/login',
      method: 'POST'
    };
    
    // Créer une réponse simulée
    const mockRes = {
      status: (code) => {
        console.log(`📤 Status: ${code}`);
        return {
          json: (data) => {
            console.log('📤 Response:', JSON.stringify(data, null, 2));
            return mockRes;
          }
        };
      },
      json: (data) => {
        console.log('📤 Response:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    };
    
    // Créer une fonction next simulée
    const mockNext = (error) => {
      if (error) {
        console.log('❌ Erreur capturée par next:', error.message);
        console.log('❌ Status Code:', error.statusCode);
        console.log('❌ Code:', error.code);
        console.log('❌ Stack:', error.stack);
        
        // Simuler le middleware d'erreur
        const errorHandler = require('./src/middleware/errorHandler').errorHandler;
        errorHandler(error, mockReq, mockRes, () => {});
      } else {
        console.log('✅ Next appelé sans erreur');
      }
    };
    
    console.log('1️⃣ Test du contrôleur d\'authentification réel...');
    
    // Tester directement la fonction login du contrôleur
    try {
      await authController.login(mockReq, mockRes, mockNext);
    } catch (error) {
      console.log('❌ Erreur dans le contrôleur:', error.message);
      console.log('❌ Stack:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testControllerWithErrorHandling().catch(console.error);


