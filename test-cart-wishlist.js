// Script de test pour les fonctionnalités panier et favoris
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

// Fonction pour tester l'authentification
async function testAuth() {
  console.log('🔐 Test d\'authentification...');
  
  try {
    // Test de connexion
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Connexion réussie');
    return loginResponse.data.token;
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.response?.data || error.message);
    
    // Essayer de créer un utilisateur de test
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      }, {
        headers: getHeaders()
      });
      
      console.log('✅ Utilisateur de test créé');
      return registerResponse.data.token;
    } catch (registerError) {
      console.log('❌ Erreur lors de la création de l\'utilisateur:', registerError.response?.data || registerError.message);
      return null;
    }
  }
}

// Fonction pour tester les favoris
async function testWishlist(token) {
  console.log('\n❤️ Test des favoris...');
  
  const headers = getHeaders(token);
  
  try {
    // Ajouter un produit aux favoris
    console.log('Ajout d\'un produit aux favoris...');
    const addResponse = await axios.post(`${API_BASE_URL}/wishlist`, {
      product_id: '1'
    }, { headers });
    
    console.log('✅ Produit ajouté aux favoris:', addResponse.data);
    
    // Vérifier le nombre d'articles dans les favoris
    console.log('Vérification du nombre d\'articles...');
    const countResponse = await axios.get(`${API_BASE_URL}/wishlist/count`, { headers });
    console.log('✅ Nombre d\'articles dans les favoris:', countResponse.data);
    
    // Récupérer la liste des favoris
    console.log('Récupération de la liste des favoris...');
    const wishlistResponse = await axios.get(`${API_BASE_URL}/wishlist`, { headers });
    console.log('✅ Liste des favoris:', wishlistResponse.data);
    
    // Vérifier si un produit est dans les favoris
    console.log('Vérification si le produit est dans les favoris...');
    const checkResponse = await axios.get(`${API_BASE_URL}/wishlist/1/check`, { headers });
    console.log('✅ Produit dans les favoris:', checkResponse.data);
    
    return true;
  } catch (error) {
    console.log('❌ Erreur lors du test des favoris:', error.response?.data || error.message);
    return false;
  }
}

// Fonction pour tester le panier
async function testCart(token) {
  console.log('\n🛒 Test du panier...');
  
  const headers = getHeaders(token);
  
  try {
    // Ajouter un produit au panier
    console.log('Ajout d\'un produit au panier...');
    const addResponse = await axios.post(`${API_BASE_URL}/cart/items`, {
      product_id: '1',
      quantity: 2
    }, { headers });
    
    console.log('✅ Produit ajouté au panier:', addResponse.data);
    
    // Récupérer le panier
    console.log('Récupération du panier...');
    const cartResponse = await axios.get(`${API_BASE_URL}/cart`, { headers });
    console.log('✅ Panier récupéré:', cartResponse.data);
    
    // Mettre à jour la quantité d'un article
    if (cartResponse.data.items && cartResponse.data.items.length > 0) {
      const itemId = cartResponse.data.items[0].id;
      console.log('Mise à jour de la quantité...');
      const updateResponse = await axios.put(`${API_BASE_URL}/cart/items/${itemId}`, {
        quantity: 3
      }, { headers });
      
      console.log('✅ Quantité mise à jour:', updateResponse.data);
    }
    
    // Appliquer un coupon
    console.log('Application d\'un coupon...');
    try {
      const couponResponse = await axios.post(`${API_BASE_URL}/cart/coupon`, {
        code: 'WELCOME10'
      }, { headers });
      
      console.log('✅ Coupon appliqué:', couponResponse.data);
    } catch (couponError) {
      console.log('⚠️ Coupon non appliqué (normal si pas de coupon valide):', couponError.response?.data?.message || couponError.message);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Erreur lors du test du panier:', error.response?.data || error.message);
    return false;
  }
}

// Fonction pour tester les produits
async function testProducts() {
  console.log('\n📦 Test des produits...');
  
  try {
    // Récupérer la liste des produits
    const productsResponse = await axios.get(`${API_BASE_URL}/products`, {
      headers: getHeaders()
    });
    
    console.log('✅ Produits récupérés:', productsResponse.data);
    
    if (productsResponse.data.data && productsResponse.data.data.length > 0) {
      const firstProduct = productsResponse.data.data[0];
      console.log('✅ Premier produit:', firstProduct);
      return firstProduct.id;
    } else {
      console.log('⚠️ Aucun produit trouvé');
      return '1'; // ID par défaut pour les tests
    }
  } catch (error) {
    console.log('❌ Erreur lors de la récupération des produits:', error.response?.data || error.message);
    return '1'; // ID par défaut pour les tests
  }
}

// Fonction principale
async function runTests() {
  console.log('🚀 Démarrage des tests panier et favoris...\n');
  
  // Test des produits
  const productId = await testProducts();
  
  // Test d'authentification
  const token = await testAuth();
  
  if (!token) {
    console.log('❌ Impossible de continuer sans token d\'authentification');
    return;
  }
  
  // Test des favoris
  const wishlistSuccess = await testWishlist(token);
  
  // Test du panier
  const cartSuccess = await testCart(token);
  
  // Résumé
  console.log('\n📊 Résumé des tests:');
  console.log(`✅ Authentification: ${token ? 'Réussie' : 'Échec'}`);
  console.log(`✅ Favoris: ${wishlistSuccess ? 'Réussi' : 'Échec'}`);
  console.log(`✅ Panier: ${cartSuccess ? 'Réussi' : 'Échec'}`);
  
  if (wishlistSuccess && cartSuccess) {
    console.log('\n🎉 Tous les tests sont passés avec succès!');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration du backend.');
  }
}

// Exécuter les tests
runTests().catch(console.error);









































