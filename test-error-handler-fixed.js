const express = require('express');
const { asyncHandler, commonErrors } = require('./src/middleware/errorHandler');

async function testErrorHandlerFixed() {
  console.log('🔍 Test du middleware d\'erreur avec gestion d\'erreur...\n');
  
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
    
    console.log('1️⃣ Test de la fonction asyncHandler...');
    
    // Créer une fonction qui simule le contrôleur
    const mockController = asyncHandler(async (req, res, next) => {
      console.log('🔍 Dans le contrôleur simulé...');
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        throw commonErrors.badRequest('Email et mot de passe requis');
      }
      
      // Simuler une erreur 401
      throw commonErrors.unauthorized('Identifiants invalides');
    });
    
    // Tester la fonction
    await mockController(mockReq, mockRes, mockNext);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testErrorHandlerFixed().catch(console.error);


