const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = null;

// Login pour obtenir un token
async function login() {
  try {
    console.log('🔐 Connexion...');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@afrikmode.com',
      password: 'AfrikMode2024!'
    });
    
    authToken = response.data.data.access_token;
    console.log('✅ Connecté avec succès');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return false;
  }
}

// Configuration axios avec auth header
function setAuthHeader() {
  axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
}

// Test de configuration Firebase
async function testFirebaseConfig() {
  try {
    console.log('🔥 Test de la configuration Firebase...');
    
    const response = await axios.get(`${BASE_URL}/notifications/config`);
    console.log('✅ Configuration Firebase:', response.data);
    
  } catch (error) {
    console.error('❌ Erreur configuration:', error.response?.data || error.message);
  }
}

// Test d'enregistrement d'un token de test
async function testRegisterToken() {
  try {
    console.log('📱 Test d\'enregistrement de token...');
    
    const tokenData = {
      token: 'test_fcm_token_' + Date.now(),
      token_type: 'fcm',
      device_id: 'test_device_001',
      platform: 'web',
      app_version: '1.0.0',
      device_model: 'Chrome Browser',
      os_version: 'Windows 10',
      language: 'fr'
    };
    
    const response = await axios.post(`${BASE_URL}/notifications/register-token`, tokenData);
    console.log('✅ Token enregistré:', response.data);
    
    return response.data.deviceToken;
    
  } catch (error) {
    console.error('❌ Erreur enregistrement token:', error.response?.data || error.message);
    return null;
  }
}

// Test d'envoi de notification
async function testSendNotification(deviceToken) {
  try {
    console.log('📩 Test d\'envoi de notification...');
    
    const notificationData = {
      title: 'Test Notification AfrikMode',
      body: 'Ceci est un test de notification push !',
      type: 'test',
      category: 'general',
      data: {
        test: true,
        timestamp: Date.now()
      }
    };
    
    const response = await axios.post(`${BASE_URL}/notifications/send`, notificationData);
    console.log('✅ Notification envoyée:', response.data);
    
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error.response?.data || error.message);
  }
}

// Test complet
async function runTests() {
  console.log('🧪 === TEST DU SYSTÈME DE NOTIFICATIONS ===\n');
  
  // Étape 1: Connexion
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Impossible de continuer sans authentification');
    return;
  }
  
  // Configurer l'en-tête d'autorisation
  setAuthHeader();
  console.log('');
  
  // Test 2: Configuration Firebase
  await testFirebaseConfig();
  console.log('');
  
  // Test 3: Enregistrement de token
  const deviceToken = await testRegisterToken();
  console.log('');
  
  // Test 4: Envoi de notification
  if (deviceToken) {
    await testSendNotification(deviceToken);
  }
  
  console.log('\n🎉 Tests terminés !');
}

runTests();