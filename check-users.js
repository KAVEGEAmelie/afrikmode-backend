const db = require('./src/config/database');

async function checkUsers() {
  try {
    const users = await db('users')
      .select('id', 'email', 'status', 'email_verified', 'role')
      .orderBy('created_at', 'desc');
    
    console.log('📊 UTILISATEURS DANS LA BASE:');
    console.log('================================');
    
    users.forEach(user => {
      console.log(`👤 ${user.email}`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Status: ${user.status}`);
      console.log(`   - Email vérifié: ${user.email_verified ? 'Oui' : 'Non'}`);
      console.log(`   - Rôle: ${user.role}`);
      console.log('');
    });
    
    console.log(`Total: ${users.length} utilisateur(s)`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await db.destroy();
  }
}

checkUsers();
