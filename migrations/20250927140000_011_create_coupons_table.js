/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('coupons', function (table) {
    // Colonnes de base
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).notNullable().unique(); // Code du coupon (ex: WELCOME20)
    table.string('name', 100).notNullable(); // Nom du coupon pour l'admin
    table.text('description'); // Description du coupon
    
    // Type de coupon
    table.enu('type', [
      'percentage', // Réduction en pourcentage
      'fixed_amount', // Montant fixe
      'free_shipping', // Livraison gratuite
      'buy_x_get_y', // Acheter X obtenir Y
      'category_discount' // Réduction sur catégorie
    ]).notNullable();
    
    // Valeur de la réduction
    table.decimal('value', 10, 2).defaultTo(0); // Valeur (% ou montant)
    table.decimal('max_discount_amount', 10, 2); // Montant max de réduction (pour %)
    table.decimal('min_order_amount', 10, 2).defaultTo(0); // Montant minimum de commande
    
    // Limites d'utilisation
    table.integer('usage_limit').defaultTo(null); // Limite globale d'utilisation
    table.integer('usage_limit_per_user').defaultTo(1); // Limite par utilisateur
    table.integer('used_count').defaultTo(0); // Nombre d'utilisations
    
    // Dates de validité
    table.timestamp('start_date').notNullable(); // Date de début
    table.timestamp('end_date').notNullable(); // Date de fin
    
    // Configuration avancée
    table.boolean('is_active').defaultTo(true); // Coupon actif
    table.boolean('exclude_sale_items').defaultTo(false); // Exclure les articles en promo
    table.boolean('first_order_only').defaultTo(false); // Première commande seulement
    table.json('allowed_user_roles').defaultTo('["user"]'); // Rôles autorisés
    
    // Restrictions par produit/catégorie
    table.json('included_product_ids').defaultTo('[]'); // Produits inclus
    table.json('excluded_product_ids').defaultTo('[]'); // Produits exclus
    table.json('included_category_ids').defaultTo('[]'); // Catégories incluses
    table.json('excluded_category_ids').defaultTo('[]'); // Catégories exclues
    
    // Configuration Buy X Get Y
    table.integer('buy_x_quantity').defaultTo(null); // Quantité à acheter
    table.integer('get_y_quantity').defaultTo(null); // Quantité gratuite
    table.uuid('get_y_product_id').nullable(); // Produit gratuit spécifique
    
    // Configuration spéciale livraison
    table.json('shipping_zone_ids').defaultTo('[]'); // Zones de livraison concernées
    
    // Métadonnées
    table.uuid('created_by').notNullable(); // Créé par (admin)
    table.uuid('tenant_id').notNullable(); // Multi-tenant
    table.timestamps(true, true); // created_at, updated_at
    
    // Index
    table.index(['code'], 'coupons_code_index');
    table.index(['type'], 'coupons_type_index');
    table.index(['is_active', 'start_date', 'end_date'], 'coupons_active_dates_index');
    table.index(['tenant_id'], 'coupons_tenant_index');
    table.index(['created_by'], 'coupons_creator_index');
    
    // Foreign keys
    table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
    // tenant_id n'a pas de contrainte FK pour éviter les problèmes de référence circulaire
    
    // Contraintes seront gérées au niveau de l'application pour éviter les erreurs SQL
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('coupons');
};