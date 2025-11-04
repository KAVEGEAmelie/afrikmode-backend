const bcrypt = require('bcrypt');
const { db } = require('./src/config/database');

async function testLogin() {
  try {
    console.log('🔍 Test de connexion pour vendor@test.com');
    
    // 1. Récupérer l'utilisateur
    const user = await db('users')
      .where({ email: 'vendor@test.com' })
      .whereNull('deleted_at')
      .first();
    
    console.log('👤 Utilisateur trouvé:', user ? 'Oui' : 'Non');
    if (user) {
      console.log('📧 Email:', user.email);
      console.log('🔐 Hash présent:', user.password_hash ? 'Oui' : 'Non');
      console.log('📏 Longueur hash:', user.password_hash ? user.password_hash.length : 0);
      console.log('🎭 Rôle:', user.role);
      console.log('📊 Statut:', user.status);
    }
    
    // 2. Tester le mot de passe
    const password = 'AfrikMode2024!';
    console.log('\n🔐 Test du mot de passe...');
    
    if (user && user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('✅ Mot de passe valide:', isValid);
      
      if (!isValid) {
        console.log('❌ Le mot de passe ne correspond pas au hash');
        
        // Créer un nouveau hash
        console.log('\n🔄 Création d\'un nouveau hash...');
        const newHash = await bcrypt.hash(password, 12);
        console.log('🔐 Nouveau hash:', newHash);
        console.log('📏 Longueur nouveau hash:', newHash.length);
        
        // Mettre à jour en base
        await db('users')
          .where('email', 'vendor@test.com')
          .update({ password_hash: newHash });
        
        console.log('✅ Hash mis à jour en base');
        
        // Retester
        const isValidAfter = await bcrypt.compare(password, newHash);
        console.log('🧪 Test après mise à jour:', isValidAfter);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testLogin();

