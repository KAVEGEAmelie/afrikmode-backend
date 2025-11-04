const axios = require('axios');

async function testApiLogin() {
  console.log('🔍 Test direct de l\'API de login...\n');
  
  try {
    const loginData = {
      email: 'vendor@test.com',
      password: 'AfrikMode2024!',
      rememberMe: false
    };
    
    console.log('📤 Données envoyées:', loginData);
    
    const response = await axios.post('http://localhost:3001/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Réponse reçue:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Erreur lors de la requête:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Headers:', error.response.headers);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('Aucune réponse reçue:', error.request);
    } else {
      console.log('Erreur de configuration:', error.message);
    }
  }
}

testApiLogin().catch(console.error);




