/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('email_templates', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().comment('Nom du template');
    table.text('description').comment('Description du template');
    table.string('category').notNullable().comment('newsletter, promotion, transactional, welcome');
    table.text('html_content').notNullable().comment('Contenu HTML du template');
    table.text('text_content').comment('Version texte du template');
    table.json('variables').comment('Variables disponibles dans le template');
    table.string('preview_image').comment('URL de l\'image de prévisualisation');
    table.boolean('is_default').defaultTo(false).comment('Template par défaut pour sa catégorie');
    table.boolean('is_active').defaultTo(true).comment('Template actif');
    table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE').comment('Créateur du template');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['category', 'is_active']);
    table.index(['is_default', 'category']);
    table.index(['created_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('email_templates');
};