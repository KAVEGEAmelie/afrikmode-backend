/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('newsletter_subscriptions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').comment('Utilisateur abonné');
    table.string('email').notNullable().comment('Adresse email');
    table.string('status').defaultTo('subscribed').comment('subscribed, unsubscribed, bounced, complained');
    table.json('preferences').comment('Préférences d\'abonnement (types de contenu)');
    table.string('source').comment('Source de l\'abonnement (signup, purchase, manual)');
    table.timestamp('subscribed_at').defaultTo(knex.fn.now()).comment('Date d\'abonnement');
    table.timestamp('unsubscribed_at').comment('Date de désabonnement');
    table.string('unsubscribe_reason').comment('Raison du désabonnement');
    table.string('confirmation_token').comment('Token de confirmation d\'abonnement');
    table.boolean('is_confirmed').defaultTo(false).comment('Abonnement confirmé');
    table.timestamp('confirmed_at').comment('Date de confirmation');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['email', 'status']);
    table.index(['user_id', 'status']);
    table.index(['status', 'subscribed_at']);
    table.unique(['email']); // Un seul abonnement par email
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('newsletter_subscriptions');
};