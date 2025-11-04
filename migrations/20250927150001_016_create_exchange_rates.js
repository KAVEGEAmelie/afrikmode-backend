/**
 * Migration: Create exchange rates table
 * Date: 2024-09-27
 */

exports.up = function(knex) {
  return knex.schema.createTable('exchange_rates', function (table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Devises
    table.string('from_currency', 5).notNullable(); // FCFA, EUR, USD
    table.string('to_currency', 5).notNullable(); // FCFA, EUR, USD
    
    // Taux de change
    table.decimal('rate', 15, 8).notNullable(); // Taux avec haute précision
    table.decimal('inverse_rate', 15, 8).notNullable(); // Taux inverse pour optimisation
    
    // Source et metadata
    table.string('source', 100).notNullable(); // API source (fixer.io, openexchangerates, etc.)
    table.timestamp('fetched_at').defaultTo(knex.fn.now()); // Quand le taux a été récupéré
    table.timestamp('expires_at').notNullable(); // Expiration du cache
    
    // Informations additionnelles
    table.boolean('is_active').defaultTo(true);
    table.json('metadata').defaultTo('{}'); // Données supplémentaires de l'API
    
    // Timestamps
    table.timestamps(true, true);
    
    // Index pour performance
    table.index(['from_currency', 'to_currency'], 'exchange_rates_pair_index');
    table.index(['fetched_at'], 'exchange_rates_date_index');
    table.index(['expires_at'], 'exchange_rates_expires_index');
    table.index(['is_active'], 'exchange_rates_active_index');
    
    // Contrainte unique pour éviter les doublons
    table.unique(['from_currency', 'to_currency', 'source'], 'exchange_rates_unique');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('exchange_rates');
};