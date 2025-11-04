const bcrypt = require('bcrypt');
const db = require('./src/config/database');

async function debugLogin() {
  console.log('🔍 Début du diagnostic de connexion...\n');
  
  try {
    // 1. Vérifier la connexion à la base de données
    console.log('1️⃣ Test de connexion à la base de données...');
    const testQuery = await db.raw('SELECT 1 as test');
    console.log('✅ Base de données accessible:', testQuery.rows[0]);
    
    // 2. Rechercher l'utilisateur
    console.log('\n2️⃣ Recherche de l\'utilisateur vendor@test.com...');
    const user = await db('users')
      .where({ email: 'vendor@test.com' })
      .whereNull('deleted_at')
      .first();
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Statut: ${user.status}`);
    console.log(`   - Rôle: ${user.role}`);
    console.log(`   - Hash présent: ${user.password_hash ? 'Oui' : 'Non'}`);
    console.log(`   - Longueur hash: ${user.password_hash ? user.password_hash.length : 0}`);
    console.log(`   - Hash (premiers 20 chars): ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'N/A'}`);
    
    // 3. Tester le mot de passe
    console.log('\n3️⃣ Test de vérification du mot de passe...');
    const password = 'AfrikMode2024!';
    console.log(`Mot de passe à tester: ${password}`);
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`✅ Mot de passe valide: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('❌ Le mot de passe ne correspond pas au hash');
      
      // Générer un nouveau hash pour comparaison
      console.log('\n4️⃣ Génération d\'un nouveau hash pour comparaison...');
      const newHash = await bcrypt.hash(password, 12);
      console.log(`Nouveau hash généré: ${newHash.substring(0, 20)}...`);
      console.log(`Longueur nouveau hash: ${newHash.length}`);
      
      // Tester avec le nouveau hash
      const testWithNewHash = await bcrypt.compare(password, newHash);
      console.log(`Test avec nouveau hash: ${testWithNewHash}`);
      
      // Mettre à jour le hash en base
      console.log('\n5️⃣ Mise à jour du hash en base de données...');
      await db('users')
        .where({ id: user.id })
        .update({ password_hash: newHash });
      
      console.log('✅ Hash mis à jour en base');
      
      // Retester la vérification
      const retestPassword = await bcrypt.compare(password, newHash);
      console.log(`✅ Retest avec nouveau hash: ${retestPassword}`);
    }
    
    // 4. Vérifier le statut du compte
    console.log('\n6️⃣ Vérification du statut du compte...');
    console.log(`Statut actuel: ${user.status}`);
    
    if (user.status === 'pending') {
      console.log('⚠️ Compte en attente de vérification email');
      console.log('En mode développement, cela devrait être autorisé');
    } else if (user.status === 'active') {
      console.log('✅ Compte actif');
    } else {
      console.log(`⚠️ Statut inhabituel: ${user.status}`);
    }
    
    // 5. Test complet de la fonction de login
    console.log('\n7️⃣ Test complet de la logique de login...');
    
    // Simuler la logique du contrôleur
    const email = 'vendor@test.com';
    const passwordToTest = 'AfrikMode2024!';
    
    console.log(`Recherche utilisateur pour: ${email}`);
    const foundUser = await db('users')
      .where({ email: email.toLowerCase() })
      .whereNull('deleted_at')
      .first();
    
    if (!foundUser) {
      console.log('❌ Utilisateur non trouvé dans la simulation');
      return;
    }
    
    console.log('✅ Utilisateur trouvé dans la simulation');
    
    const passwordValid = await bcrypt.compare(passwordToTest, foundUser.password_hash);
    console.log(`✅ Mot de passe valide dans la simulation: ${passwordValid}`);
    
    if (!passwordValid) {
      console.log('❌ Échec de la vérification du mot de passe dans la simulation');
      return;
    }
    
    if (foundUser.status === 'pending') {
      console.log('⚠️ Compte en attente - vérification du mode développement');
      const isDev = process.env.NODE_ENV === 'development' || process.env.SKIP_EMAIL_VERIFICATION === 'true';
      console.log(`Mode développement: ${isDev}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`SKIP_EMAIL_VERIFICATION: ${process.env.SKIP_EMAIL_VERIFICATION}`);
    }
    
    console.log('\n✅ Diagnostic terminé - tous les tests sont passés');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  } finally {
    // Fermer la connexion
    await db.destroy();
    console.log('\n🔌 Connexion à la base de données fermée');
  }
}

// Exécuter le diagnostic
debugLogin().catch(console.error);
