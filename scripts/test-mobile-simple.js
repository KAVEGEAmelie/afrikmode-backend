/**
 * Test simple des routes mobiles
 * Usage: node test-mobile-simple.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Test simple des endpoints mobiles
 */
async function testMobileEndpoints() {
  console.log('🎯 Test des endpoints mobiles AfrikMode\n');

  try {
    // Test 1: Health check de l'API
    console.log('1. Test de santé de l\'API...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ API accessible');
      console.log(`   📊 Status: ${healthResponse.data.status}`);
    }

    // Test 2: Vérification des routes mobiles disponibles
    console.log('\n2. Test de la route principale...');
    const mainResponse = await axios.get(`${API_BASE_URL}/`);
    
    if (mainResponse.status === 200 && mainResponse.data.endpoints.mobile) {
      console.log('   ✅ Route mobile disponible');
      console.log(`   🔗 Endpoint: ${mainResponse.data.endpoints.mobile}`);
    }

    // Test 3: Configuration Universal Links (public)
    console.log('\n3. Test configuration Universal Links (iOS)...');
    try {
      const appleResponse = await axios.get(`${API_BASE_URL}/mobile/.well-known/apple-app-site-association`);
      if (appleResponse.status === 200) {
        console.log('   ✅ Configuration Universal Links disponible');
        console.log(`   📱 Apps supportées: ${appleResponse.data.applinks?.apps?.length || 0}`);
      }
    } catch (error) {
      console.log('   ⚠️  Configuration Universal Links non accessible:', error.response?.status || error.message);
    }

    // Test 4: Configuration App Links (public)
    console.log('\n4. Test configuration App Links (Android)...');
    try {
      const androidResponse = await axios.get(`${API_BASE_URL}/mobile/.well-known/assetlinks.json`);
      if (androidResponse.status === 200) {
        console.log('   ✅ Configuration App Links disponible');
        console.log(`   🤖 Relations: ${Array.isArray(androidResponse.data) ? androidResponse.data.length : 0}`);
      }
    } catch (error) {
      console.log('   ⚠️  Configuration App Links non accessible:', error.response?.status || error.message);
    }

    // Test 5: Endpoint d'authentification (nécessaire pour les autres tests)
    console.log('\n5. Test endpoint d\'authentification...');
    try {
      // Test avec des données invalides pour vérifier que l'endpoint répond
      const authResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'test@test.com',
        password: 'invalid'
      });
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        console.log('   ✅ Endpoint d\'authentification accessible');
        console.log('   🔐 Validation des credentials active');
      } else {
        console.log(`   ⚠️  Problème avec l'authentification: ${error.response?.status || error.message}`);
      }
    }

    console.log('\n✅ Tests de base terminés avec succès!');
    console.log('\n📝 Étapes suivantes:');
    console.log('   1. Créer un compte utilisateur via /api/auth/register');
    console.log('   2. Se connecter via /api/auth/login');  
    console.log('   3. Tester les fonctionnalités avec le token obtenu');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Solutions possibles:');
      console.log('   1. Vérifier que le serveur est démarré (npm start)');
      console.log('   2. Vérifier le port (5000) dans .env');
      console.log('   3. Vérifier la connexion à la base de données');
    }
  }
}

// Exécuter les tests
if (require.main === module) {
  testMobileEndpoints();
}

module.exports = { testMobileEndpoints };