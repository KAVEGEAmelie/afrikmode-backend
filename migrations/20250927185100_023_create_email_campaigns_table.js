/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('email_campaigns', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().comment('Nom de la campagne');
    table.string('subject').notNullable().comment('Sujet de l\'email');
    table.text('content_html').notNullable().comment('Contenu HTML de l\'email');
    table.text('content_text').comment('Version texte de l\'email');
    table.string('template_id').comment('ID du template utilisé');
    table.string('status').defaultTo('draft').comment('draft, scheduled, sending, sent, paused');
    table.string('type').notNullable().comment('newsletter, promotion, announcement, transactional');
    table.json('target_segments').comment('IDs des segments ciblés (JSON array)');
    table.json('target_users').comment('IDs des utilisateurs spécifiques ciblés (JSON array)');
    table.timestamp('scheduled_at').comment('Date d\'envoi programmée');
    table.timestamp('sent_at').comment('Date d\'envoi réelle');
    table.integer('total_recipients').defaultTo(0).comment('Nombre total de destinataires');
    table.integer('sent_count').defaultTo(0).comment('Nombre d\'emails envoyés');
    table.integer('delivered_count').defaultTo(0).comment('Nombre d\'emails livrés');
    table.integer('opened_count').defaultTo(0).comment('Nombre d\'ouvertures');
    table.integer('clicked_count').defaultTo(0).comment('Nombre de clics');
    table.integer('bounced_count').defaultTo(0).comment('Nombre de bounces');
    table.integer('unsubscribed_count').defaultTo(0).comment('Nombre de désabonnements');
    table.json('analytics_data').comment('Données d\'analytics détaillées');
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE').comment('Créateur de la campagne');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['status', 'scheduled_at']);
    table.index(['type', 'created_at']);
    table.index(['created_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('email_campaigns');
};