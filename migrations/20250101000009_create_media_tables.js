/**
 * Migration pour créer les tables de gestion des médias
 */
exports.up = function(knex) {
  return Promise.all([
    // Table pour les fichiers médias
    knex.schema.createTable('media_files', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('category', 50).notNullable().default('general');
      table.string('original_name', 255).notNullable();
      table.string('mime_type', 100).notNullable();
      table.bigInteger('file_size').notNullable();
      table.integer('width');
      table.integer('height');
      table.json('variants').comment('URLs des différentes tailles d\'image');
      table.json('metadata').comment('Métadonnées EXIF et autres');
      table.boolean('optimized').defaultTo(false);
      table.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);

      // Index pour les requêtes fréquentes
      table.index(['category']);
      table.index(['uploaded_by']);
      table.index(['created_at']);
      table.index(['mime_type']);
    }),

    // Table pour les logs d'accès aux médias (pour analytics)
    knex.schema.createTable('media_access_logs', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('media_id').references('id').inTable('media_files').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('ip_address', 45);
      table.string('user_agent', 255);
      table.string('referer', 255);
      table.string('size_accessed', 50); // thumbnail, small, medium, etc.
      table.timestamp('accessed_at').defaultTo(knex.fn.now());

      // Index pour les statistiques
      table.index(['media_id', 'accessed_at']);
      table.index(['user_id']);
      table.index(['accessed_at']);
    }),

    // Table pour la configuration système (filigrane, etc.)
    knex.schema.createTable('system_config', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('key', 100).unique().notNullable();
      table.json('value').notNullable();
      table.text('description');
      table.timestamps(true, true);

      table.index(['key']);
    }),

    // Table pour les transformations d'images en cours
    knex.schema.createTable('media_processing_jobs', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('media_id').references('id').inTable('media_files').onDelete('CASCADE');
      table.string('job_type', 50).notNullable(); // compress, resize, watermark, etc.
      table.string('status', 20).defaultTo('pending'); // pending, processing, completed, failed
      table.json('parameters'); // Paramètres de traitement
      table.json('result'); // Résultat du traitement
      table.text('error_message');
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.timestamps(true, true);

      // Index pour le monitoring des jobs
      table.index(['status']);
      table.index(['job_type']);
      table.index(['media_id']);
      table.index(['created_at']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('media_processing_jobs'),
    knex.schema.dropTableIfExists('system_config'),
    knex.schema.dropTableIfExists('media_access_logs'),
    knex.schema.dropTableIfExists('media_files')
  ]);
};