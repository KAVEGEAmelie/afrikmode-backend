/**
 * Migration pour créer les tables des webhooks
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('webhooks', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('url').notNullable();
      table.json('events').notNullable(); 
      table.string('secret').notNullable(); 
      table.json('headers').defaultTo('{}');
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);
      
      table.index(['created_by']);
      table.index(['is_active']);
    })
    .createTable('webhook_deliveries', table => {
      table.increments('id').primary();
      table.uuid('webhook_id').references('id').inTable('webhooks').onDelete('CASCADE');
      table.string('event_type').notNullable();
      table.json('payload'); 
      table.integer('response_status').defaultTo(0);
      table.text('response_body');
      table.boolean('success').defaultTo(false);
      table.timestamp('delivered_at').defaultTo(knex.fn.now());
      
      table.index(['webhook_id']);
      table.index(['event_type']);
      table.index(['delivered_at']);
      table.index(['success']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('webhook_deliveries')
    .dropTableIfExists('webhooks');
};