/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('device_tokens', function (table) {
    // Colonnes de base
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable(); // Utilisateur propriétaire du device
    
    // Informations du token
    table.text('token').notNullable(); // Token FCM/OneSignal/APNS
    table.string('token_type', 50).notNullable(); // 'fcm', 'onesignal', 'apns'
    table.string('device_id').notNullable(); // ID unique du device
    
    // Informations du device
    table.string('platform', 20).notNullable(); // 'android', 'ios', 'web'
    table.string('app_version', 20); // Version de l'app
    table.string('device_model', 100); // Modèle du device
    table.string('os_version', 50); // Version de l'OS
    table.string('language', 5).defaultTo('fr'); // Langue préférée
    
    // Configuration des notifications
    table.boolean('notifications_enabled').defaultTo(true); // Notifications activées
    table.json('notification_preferences').defaultTo('{}'); // Préférences par type
    
    // Informations de connexion
    table.timestamp('last_active_at').defaultTo(knex.fn.now()); // Dernière activité
    table.string('timezone', 50).defaultTo('Africa/Lome'); // Fuseau horaire
    table.json('location_data').defaultTo('{}'); // Données de localisation (optionnel)
    
    // Status du token
    table.boolean('is_active').defaultTo(true); // Token actif
    table.integer('failed_attempts').defaultTo(0); // Nombre d'échecs d'envoi
    table.timestamp('last_notification_sent'); // Dernière notification envoyée
    
    // Métadonnées
    table.uuid('tenant_id').notNullable(); // Multi-tenant
    table.timestamps(true, true); // created_at, updated_at
    
    // Index pour performance
    table.index(['user_id'], 'device_tokens_user_index');
    table.index(['token'], 'device_tokens_token_index');
    table.index(['device_id'], 'device_tokens_device_index');
    table.index(['platform'], 'device_tokens_platform_index');
    table.index(['is_active'], 'device_tokens_active_index');
    table.index(['tenant_id'], 'device_tokens_tenant_index');
    table.index(['user_id', 'platform'], 'device_tokens_user_platform_index');
    table.index(['notifications_enabled'], 'device_tokens_notifications_enabled_index');
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('tenant_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Contraintes uniques
    table.unique(['user_id', 'device_id'], 'device_tokens_user_device_unique');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('device_tokens');
};