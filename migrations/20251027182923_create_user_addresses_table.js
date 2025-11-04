/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('user_addresses', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    
    // Informations de l'adresse
    table.string('first_name', 255).notNullable();
    table.string('last_name', 255).notNullable();
    table.string('phone', 50).notNullable();
    table.string('email', 255);
    
    // Adresse
    table.text('address_line_1').notNullable();
    table.text('address_line_2').nullable();
    table.string('city', 255).notNullable();
    table.string('postal_code', 20).notNullable();
    table.string('country', 10).defaultTo('CI');
    table.string('state', 255).nullable();
    
    // Métadonnées
    table.string('type', 20).defaultTo('shipping') // shipping or billing
      .notNullable();
    table.boolean('is_default').defaultTo(false);
    
    // Labels personnalisés
    table.string('label', 100).nullable(); // Maison, Bureau, etc.
    
    // Coordonnées GPS (optionnel)
    table.decimal('latitude', 10, 7).nullable();
    table.decimal('longitude', 10, 7).nullable();
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Index
    table.index(['user_id', 'type']);
    table.index(['user_id', 'is_default']);
    table.index('deleted_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_addresses');
};
