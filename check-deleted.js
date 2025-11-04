const db = require('./src/config/database');

async function checkDeletedAt() {
  try {
    const users = await db('users')
      .select('id', 'email', 'deleted_at')
      .where({ email: 'vendor@test.com' });
    
    console.log('📊 VÉRIFICATION deleted_at:');
    console.log('============================');
    
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log(`deleted_at: ${user.deleted_at === null ? 'NULL (OK)' : user.deleted_at}`);
    });
    
    console.log('');
    console.log('Test avec whereNull:');
    const usersNotDeleted = await db('users')
      .where({ email: 'vendor@test.com' })
      .whereNull('deleted_at');
    
    console.log(`Résultats avec whereNull: ${usersNotDeleted.length}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await db.destroy();
  }
}

checkDeletedAt();
