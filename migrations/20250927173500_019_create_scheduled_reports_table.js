/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('scheduled_reports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().comment('Nom du rapport programmé');
    table.string('type').notNullable().comment('Type: sales, inventory, customers, orders');
    table.string('format').notNullable().defaultTo('pdf').comment('Format: pdf, excel, csv');
    table.string('frequency').notNullable().comment('Fréquence: daily, weekly, monthly, yearly');
    table.json('filters').comment('Filtres JSON pour le rapport');
    table.json('recipients').notNullable().comment('Liste des emails destinataires');
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE').comment('Créateur du rapport');
    table.boolean('is_active').defaultTo(true).comment('Rapport actif ou non');
    table.timestamp('last_generated_at').comment('Dernière génération');
    table.timestamp('next_generation_at').comment('Prochaine génération');
    table.json('generation_log').comment('Log des générations');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['type', 'is_active']);
    table.index(['frequency', 'next_generation_at']);
    table.index(['created_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('scheduled_reports');
};