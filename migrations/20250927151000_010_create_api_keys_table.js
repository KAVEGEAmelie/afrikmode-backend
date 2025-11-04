/**
 * Migration pour créer les tables des clés API
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('api_keys', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('key').notNullable().unique();
      table.json('permissions').defaultTo('[]');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_used_at').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['key']);
      table.index(['is_active']);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('api_keys');
};