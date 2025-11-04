/**
 * Migration: Create cart and wishlist tables
 * Date: 2025-01-03
 */

exports.up = function(knex) {
  return Promise.all([
    // Table panier
    knex.schema.createTable('cart_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('product_id').notNullable();
      table.integer('quantity').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
      
      // Indexes
      table.index(['user_id']);
      table.index(['product_id']);
      table.index(['deleted_at']);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
      
      // Unique constraint pour éviter les doublons
      table.unique(['user_id', 'product_id'], 'unique_user_product_cart');
    }),
    
    // Table wishlist
    knex.schema.createTable('wishlist_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.uuid('product_id').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
      
      // Indexes
      table.index(['user_id']);
      table.index(['product_id']);
      table.index(['deleted_at']);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
      
      // Unique constraint pour éviter les doublons
      table.unique(['user_id', 'product_id'], 'unique_user_product_wishlist');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('wishlist_items'),
    knex.schema.dropTableIfExists('cart_items')
  ]);
};