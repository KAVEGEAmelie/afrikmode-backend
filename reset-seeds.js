const knex = require('./knexfile');
const db = require('knex')(knex.development);

async function resetSeeds() {
  try {
    console.log('🗑️  Suppression des données existantes...');
    
    // Supprimer dans l'ordre inverse des dépendances
    const tables = [
      'notifications',
      'device_tokens',
      'coupon_usage',
      'coupons',
      'ticket_messages',
      'tickets',
      'product_reviews',
      'store_reviews',
      'payments',
      'order_items',
      'orders',
      'products',
      'categories',
      'stores',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await db(table).del();
        console.log(`✅ Table ${table} vidée`);
      } catch (error) {
        console.log(`⚠️  Table ${table} n'existe pas ou déjà vide`);
      }
    }
    
    console.log('✅ Suppression terminée');
    
    // Maintenant exécuter les seeds
    console.log('🌱 Exécution des seeds...');
    await db.seed.run();
    
    console.log('🎉 Seeds exécutés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.destroy();
  }
}

resetSeeds();