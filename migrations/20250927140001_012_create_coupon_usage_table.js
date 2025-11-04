/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('coupon_usage', function (table) {
    // Colonnes de base
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('coupon_id').notNullable(); // Référence vers le coupon
    table.uuid('user_id').notNullable(); // Utilisateur qui a utilisé le coupon
    table.uuid('order_id').notNullable(); // Commande associée
    
    // Détails de l'utilisation
    table.decimal('discount_amount', 10, 2).notNullable(); // Montant de la réduction appliquée
    table.decimal('order_total', 10, 2).notNullable(); // Total de la commande avant réduction
    table.decimal('final_total', 10, 2).notNullable(); // Total final après réduction
    
    // Informations sur l'application du coupon
    table.string('coupon_type', 50).notNullable(); // Type du coupon au moment de l'usage
    table.decimal('coupon_value', 10, 2).notNullable(); // Valeur du coupon au moment de l'usage
    table.json('applied_to_items').defaultTo('[]'); // Items auxquels le coupon a été appliqué
    
    // Métadonnées
    table.uuid('tenant_id').notNullable(); // Multi-tenant
    table.timestamp('used_at').defaultTo(knex.fn.now()); // Date d'utilisation
    table.timestamps(true, true); // created_at, updated_at
    
    // Index
    table.index(['coupon_id'], 'coupon_usage_coupon_index');
    table.index(['user_id'], 'coupon_usage_user_index');
    table.index(['order_id'], 'coupon_usage_order_index');
    table.index(['tenant_id'], 'coupon_usage_tenant_index');
    table.index(['used_at'], 'coupon_usage_date_index');
    table.index(['coupon_id', 'user_id'], 'coupon_usage_coupon_user_index');
    
    // Foreign keys
    table.foreign('coupon_id').references('id').inTable('coupons').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('order_id').references('id').inTable('orders').onDelete('CASCADE');
    table.foreign('tenant_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Contrainte unique pour éviter l'utilisation multiple du même coupon sur la même commande
    table.unique(['coupon_id', 'order_id'], 'coupon_usage_unique_per_order');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('coupon_usage');
};