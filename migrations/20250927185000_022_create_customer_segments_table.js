/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('customer_segments', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().comment('Nom du segment');
    table.text('description').comment('Description du segment');
    table.string('type').notNullable().comment('new_customers, loyal_customers, inactive_customers, high_value, etc.');
    table.json('criteria').notNullable().comment('Critères de segmentation (JSON)');
    table.boolean('is_active').defaultTo(true).comment('Segment actif');
    table.integer('customer_count').defaultTo(0).comment('Nombre de clients dans ce segment');
    table.timestamp('last_calculated_at').comment('Dernière mise à jour du segment');
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE').comment('Créateur du segment');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['type', 'is_active']);
    table.index(['created_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('customer_segments');
};