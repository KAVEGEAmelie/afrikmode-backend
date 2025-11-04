/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('email_analytics', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('campaign_id').references('id').inTable('email_campaigns').onDelete('CASCADE').comment('Campagne associée');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').comment('Utilisateur concerné');
    table.string('email').notNullable().comment('Adresse email du destinataire');
    table.string('event_type').notNullable().comment('sent, delivered, opened, clicked, bounced, unsubscribed, complained');
    table.timestamp('event_timestamp').defaultTo(knex.fn.now()).comment('Moment de l\'événement');
    table.string('link_url').comment('URL cliquée (pour les clics)');
    table.string('user_agent').comment('User agent du client');
    table.string('ip_address').comment('Adresse IP');
    table.json('metadata').comment('Métadonnées additionnelles');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['campaign_id', 'event_type']);
    table.index(['user_id', 'event_type']);
    table.index(['email', 'event_type']);
    table.index(['event_timestamp']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('email_analytics');
};