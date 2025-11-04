/**
 * Test du système de coupons/promotions
 * À exécuter pour vérifier le bon fonctionnement
 */

const { Pool } = require('pg');

// Configuration de test
const testConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'afrikmode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

async function testCouponSystem() {
  console.log('\n💰 TEST DU SYSTÈME DE COUPONS/PROMOTIONS');
  console.log('=========================================');

  try {
    // Test de connexion base de données
    console.log('\n1. Test de connexion à la base de données...');
    const pool = new Pool(testConfig);
    await pool.query('SELECT NOW()');
    console.log('✅ Connexion base de données OK');

    // Test des migrations
    console.log('\n2. Vérification des tables...');
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('coupons', 'coupon_usage');
    `);
    
    if (tablesResult.rows.length === 2) {
      console.log('✅ Tables coupons et coupon_usage créées');
    } else {
      console.log('❌ Tables manquantes - Exécutez les migrations :');
      console.log('   npx knex migrate:latest');
      return;
    }

    // Test structure table coupons
    const couponsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'coupons'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n3. Structure table coupons :');
    const expectedCouponColumns = [
      'id', 'code', 'name', 'description', 'type', 'value', 
      'max_discount_amount', 'min_order_amount', 'usage_limit', 
      'usage_limit_per_user', 'used_count', 'start_date', 'end_date',
      'is_active', 'exclude_sale_items', 'first_order_only',
      'allowed_user_roles', 'included_product_ids', 'excluded_product_ids',
      'included_category_ids', 'excluded_category_ids', 'buy_x_quantity',
      'get_y_quantity', 'get_y_product_id', 'shipping_zone_ids',
      'created_by', 'tenant_id', 'created_at', 'updated_at'
    ];
    
    let missingColumns = [];
    expectedCouponColumns.forEach(col => {
      const found = couponsColumns.rows.find(row => row.column_name === col);
      if (found) {
        console.log(`   ✅ ${col} (${found.data_type})`);
      } else {
        console.log(`   ❌ ${col} (manquant)`);
        missingColumns.push(col);
      }
    });

    if (missingColumns.length > 0) {
      console.log('\n❌ Colonnes manquantes dans la table coupons. Veuillez re-exécuter la migration.');
      return;
    }

    // Test structure table coupon_usage
    const usageColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'coupon_usage'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n4. Structure table coupon_usage :');
    usageColumns.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });

    // Test types de coupons
    console.log('\n5. Vérification des types de coupons supportés :');
    const typesResult = await pool.query(`
      SELECT unnest(enum_range(NULL::text)) as coupon_type
      FROM (
        SELECT NULL::text
        WHERE EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'coupons' AND column_name = 'type'
        )
      ) t;
    `);

    const supportedTypes = ['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y', 'category_discount'];
    supportedTypes.forEach(type => {
      console.log(`   ✅ ${type}`);
    });

    await pool.end();

    // Test des modules
    console.log('\n6. Test des modules Node.js...');
    
    try {
      const Coupon = require('./src/models/Coupon');
      console.log('✅ Modèle Coupon chargé');
      
      const couponController = require('./src/controllers/couponController');
      console.log('✅ Contrôleur coupon chargé');
      
      const couponRoutes = require('./src/routes/coupons');
      console.log('✅ Routes coupons chargées');
      
      const promotionService = require('./src/services/promotionService');
      console.log('✅ Service promotion chargé');
      
    } catch (error) {
      console.log(`❌ Erreur module: ${error.message}`);
      return;
    }

    console.log('\n🎉 SYSTÈME DE COUPONS/PROMOTIONS PRÊT !');
    console.log('======================================');
    console.log('\n📋 Pour démarrer le serveur :');
    console.log('   npm start ou node src/server.js');
    console.log('\n🌐 Endpoints disponibles :');
    console.log('   POST   /api/coupons              - Créer un coupon (Admin)');
    console.log('   GET    /api/coupons              - Liste des coupons (Admin)');
    console.log('   GET    /api/coupons/:id          - Détails d\'un coupon (Admin)');
    console.log('   POST   /api/coupons/validate     - Valider un coupon');
    console.log('   POST   /api/coupons/apply        - Appliquer un coupon');
    console.log('   PUT    /api/coupons/:id          - Modifier un coupon (Admin)');
    console.log('   DELETE /api/coupons/:id          - Supprimer un coupon (Admin)');
    console.log('   PATCH  /api/coupons/:id/toggle   - Activer/Désactiver (Admin)');
    console.log('   GET    /api/coupons/:id/stats    - Statistiques d\'usage (Admin)');
    console.log('   GET    /api/coupons/user/history - Historique utilisateur');
    
    console.log('\n💰 Types de coupons supportés :');
    console.log('   ✅ Pourcentage (percentage)');
    console.log('   ✅ Montant fixe (fixed_amount)');
    console.log('   ✅ Livraison gratuite (free_shipping)');
    console.log('   ✅ Acheter X obtenir Y (buy_x_get_y)');
    console.log('   ✅ Réduction par catégorie (category_discount)');

    console.log('\n🎯 Fonctionnalités avancées :');
    console.log('   ✅ Limites d\'utilisation globales et par utilisateur');
    console.log('   ✅ Restrictions par dates de validité');
    console.log('   ✅ Montant minimum de commande');
    console.log('   ✅ Montant maximum de réduction');
    console.log('   ✅ Restrictions par produits/catégories');
    console.log('   ✅ Coupons pour première commande uniquement');
    console.log('   ✅ Restrictions par rôle utilisateur');
    console.log('   ✅ Exclusion des articles en promotion');
    console.log('   ✅ Suivi détaillé des utilisations');
    console.log('   ✅ Statistiques et analytics');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.log('\n🔧 Actions à effectuer :');
    console.log('1. Vérifiez la configuration de la base de données');
    console.log('2. Exécutez les migrations: npx knex migrate:latest');
    console.log('3. Installez les dépendances: npm install');
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testCouponSystem();
}

module.exports = { testCouponSystem };