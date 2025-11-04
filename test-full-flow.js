const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./src/config/database');
const authController = require('./src/controllers/authController');
const { asyncHandler, commonErrors } = require('./src/middleware/errorHandler');

async function testFullFlow() {
  console.log('🔍 Test du flux complet d\'authentification...\n');
  
  try {
    // Simuler une requête Express
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
      }
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
      } else {
        console.log('✅ Next appelé sans erreur');
      }
    };
    
    console.log('1️⃣ Test direct du contrôleur...');
    
    // Tester directement la fonction login
    try {
      await authController.login(mockReq, mockRes, mockNext);
    } catch (error) {
      console.log('❌ Erreur dans le contrôleur:', error.message);
      console.log('❌ Stack:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await db.destroy();
  }
}

testFullFlow().catch(console.error);

