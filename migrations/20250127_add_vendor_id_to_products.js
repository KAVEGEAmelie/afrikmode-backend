/**
 * Migration: Add vendor_id column to products table
 * This allows direct vendor queries without joining through stores
 */

exports.up = function(knex) {
  return knex.schema.alterTable('products', (table) => {
    // Add vendor_id column
    table.uuid('vendor_id')
      .nullable()
      .references('id')
      .inTable('users');
    
    // Add index for better query performance
    table.index('vendor_id');
  }).then(() => {
    // Populate vendor_id for existing products by joining with stores
    return knex.raw(`
      UPDATE products p
      SET vendor_id = s.owner_id
      FROM stores s
      WHERE p.store_id = s.id
    `);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.dropIndex('vendor_id');
    table.dropColumn('vendor_id');
  });
};
























