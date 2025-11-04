const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Importer les routes
const routes = require('./src/routes');

async function testServerConfig() {
  console.log('🔍 Test de la configuration du serveur...\n');
  
  try {
    const app = express();
    const server = http.createServer(app);
    
    // Configuration des middlewares (comme dans le serveur principal)
    app.use(helmet());
    app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));
    app.use(morgan('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Route de santé
    app.get('/health', (req, res) => {
      res.json({ status: 'OK', message: 'Server is running' });
    });
    
    // Routes
    app.use('/api', routes);
    
    // Gestion des erreurs
    app.use((err, req, res, next) => {
      console.error('❌ Erreur dans le serveur:', err.stack);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    });
    
    // Démarrer le serveur
    const PORT = 3002; // Port différent pour éviter les conflits
    server.listen(PORT, () => {
      console.log(`🚀 Serveur de test démarré sur http://localhost:${PORT}`);
      
      // Tester l'API
      testApi();
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

async function testApi() {
  console.log('\n🔍 Test de l\'API de login...');
  
  try {
    const axios = require('axios');
    
    const loginData = {
      email: 'vendor@test.com',
      password: 'AfrikMode2024!',
      rememberMe: false
    };
    
    console.log('📤 Données envoyées:', loginData);
    
    const response = await axios.post('http://localhost:3002/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // Accepte tous les codes de statut < 500
      }
    });
    
    console.log('✅ Réponse reçue:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('🎉 Connexion réussie !');
    } else {
      console.log('❌ Connexion échouée');
    }
    
  } catch (error) {
    console.log('❌ Erreur lors de la requête:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Erreur:', error.message);
    }
  }
}

testServerConfig().catch(console.error);


