require('dotenv').config();
const admin = require('firebase-admin');

console.log('🧪 Test d\'initialisation Firebase...');

try {
  let serviceAccount = null;
  
  // Vérifier si la variable d'environnement ou le fichier existent
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('✅ Variable FIREBASE_SERVICE_ACCOUNT trouvée');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.log('✅ Variable FIREBASE_SERVICE_ACCOUNT_PATH trouvée');
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    console.log('❌ Aucune configuration Firebase trouvée');
    process.exit(1);
  }
  
  console.log('✅ Configuration Firebase chargée avec succès');
  console.log(`📍 Project ID: ${serviceAccount.project_id}`);
  console.log(`📍 Client Email: ${serviceAccount.client_email}`);
  
  // Tenter d'initialiser Firebase
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    
    const messaging = admin.messaging();
    console.log('✅ Firebase Cloud Messaging initialisé avec succès');
    
  } catch (firebaseError) {
    console.log('❌ Erreur initialisation Firebase:', firebaseError.message);
    process.exit(1);
  }
  
  console.log('🎉 Test réussi ! Firebase est correctement configuré.');
  
} catch (error) {
  console.error('❌ Erreur générale:', error);
}

process.exit(0);