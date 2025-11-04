/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('report_exports', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('file_name').notNullable().comment('Nom du fichier exporté');
    table.string('file_path').notNullable().comment('Chemin vers le fichier');
    table.string('file_type').notNullable().comment('Type: pdf, xlsx, csv');
    table.bigInteger('file_size').comment('Taille du fichier en bytes');
    table.string('report_type').notNullable().comment('Type de rapport');
    table.json('filters_used').comment('Filtres utilisés pour générer');
    table.uuid('generated_by').references('id').inTable('users').onDelete('CASCADE').comment('Utilisateur ayant généré');
    table.uuid('scheduled_report_id').references('id').inTable('scheduled_reports').onDelete('SET NULL').comment('Rapport programmé source');
    table.string('status').defaultTo('pending').comment('pending, completed, failed, expired');
    table.timestamp('expires_at').comment('Date d\'expiration du fichier');
    table.json('metadata').comment('Métadonnées additionnelles');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['generated_by', 'created_at']);
    table.index(['status', 'expires_at']);
    table.index(['report_type', 'created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('report_exports');
};