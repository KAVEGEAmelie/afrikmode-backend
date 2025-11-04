// Script de test pour vérifier les corrections d'authentification
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Configuration des headers
const getHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Test de connexion
async function testLogin() {
  console.log('🔐 Test de connexion...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Connexion réussie');
    return response.data.data.token;
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.response?.data || error.message);
    return null;
  }
}

// Test de rafraîchissement du token
async function testRefreshToken(token) {
  console.log('🔄 Test de rafraîchissement du token...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: 'test_refresh_token'
    }, {
      headers: getHeaders(token)
    });
    
    console.log('✅ Rafraîchissement réussi');
    return response.data;
  } catch (error) {
    console.log('❌ Erreur de rafraîchissement:', error.response?.data || error.message);
    return null;
  }
}

// Test des routes protégées
async function testProtectedRoutes(token) {
  console.log('🛡️ Test des routes protégées...');
  
  const routes = [
    { name: 'Panier', url: '/cart' },
    { name: 'Favoris', url: '/wishlist/count' },
    { name: 'Profil', url: '/auth/me' }
  ];
  
  for (const route of routes) {
    try {
      const response = await axios.get(`${API_BASE_URL}${route.url}`, {
        headers: getHeaders(token)
      });
      
      console.log(`✅ ${route.name}: OK`);
    } catch (error) {
      console.log(`❌ ${route.name}: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
  }
}

// Test principal
async function runTests() {
  console.log('🚀 Démarrage des tests d\'authentification...\n');
  
  // Test 1: Connexion
  const token = await testLogin();
  if (!token) {
    console.log('❌ Impossible de continuer sans token');
    return;
  }
  
  console.log('');
  
  // Test 2: Routes protégées
  await testProtectedRoutes(token);
  
  console.log('');
  
  // Test 3: Rafraîchissement (peut échouer si pas de refresh token valide)
  await testRefreshToken(token);
  
  console.log('\n📊 Tests terminés');
}

// Exécuter les tests
runTests().catch(console.error);