/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Activer l'extension UUID si elle n'existe pas
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Table pour les deep links (sans conflit avec device_tokens existante)
  if (!(await knex.schema.hasTable('deep_links'))) {
    await knex.schema.createTable('deep_links', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('short_code', 12).notNullable().unique();
      table.string('type', 30).notNullable(); // product, store, order, promo, referral
      table.uuid('target_id').notNullable();
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('original_url').notNullable();
      table.text('web_fallback_url');
      table.text('ios_fallback_url');
      table.text('android_fallback_url');
      table.json('utm_params'); // utm_source, utm_medium, utm_campaign, etc.
      table.json('metadata'); // Données additionnelles
      table.timestamp('expires_at');
      table.boolean('is_active').defaultTo(true);
      table.integer('click_count').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['short_code']);
      table.index(['type', 'target_id']);
      table.index(['created_by']);
      table.index(['expires_at']);
      table.index(['is_active']);
    });
  }

  // Table pour l'analytics des deep links
  if (!(await knex.schema.hasTable('deep_link_clicks'))) {
    await knex.schema.createTable('deep_link_clicks', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('deep_link_id').references('id').inTable('deep_links').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('ip_address', 45);
      table.text('user_agent');
      table.string('platform', 30); // ios, android, web
      table.string('device_type', 30); // mobile, tablet, desktop
      table.string('browser', 50);
      table.string('os', 50);
      table.string('country_code', 2);
      table.string('city', 100);
      table.text('referer_url');
      table.boolean('conversion').defaultTo(false); // Si l'utilisateur a effectué l'action cible
      table.timestamp('clicked_at').defaultTo(knex.fn.now());
      
      table.index(['deep_link_id']);
      table.index(['user_id']);
      table.index(['platform']);
      table.index(['clicked_at']);
      table.index(['country_code']);
      table.index(['conversion']);
    });
  }

  // Table pour les logs de notifications push
  if (!(await knex.schema.hasTable('push_notification_logs'))) {
    await knex.schema.createTable('push_notification_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.text('fcm_token');
      table.string('notification_type', 50); // order_confirmed, product_back_in_stock, etc.
      table.string('title', 255);
      table.text('body');
      table.json('data'); // Payload de données
      table.json('context'); // Contexte de la notification
      table.string('status', 20).defaultTo('pending'); // pending, sent, failed, delivered, clicked
      table.text('fcm_response'); // Réponse de FCM
      table.text('error_message');
      table.timestamp('sent_at');
      table.timestamp('delivered_at');
      table.timestamp('clicked_at');
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['notification_type']);
      table.index(['status']);
      table.index(['sent_at']);
    });
  }

  // Table pour le cache hors ligne
  if (!(await knex.schema.hasTable('offline_cache_logs'))) {
    await knex.schema.createTable('offline_cache_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('data_type', 50).notNullable(); // products, categories, profile, stores
      table.string('cache_key', 255).notNullable();
      table.integer('data_size').defaultTo(0); // Taille des données en bytes
      table.json('preferences'); // Préférences de cache de l'utilisateur
      table.timestamp('cached_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at');
      table.timestamp('last_accessed_at');
      table.integer('access_count').defaultTo(0);
      table.boolean('is_valid').defaultTo(true);
      
      table.index(['user_id', 'data_type']);
      table.index(['cache_key']);
      table.index(['cached_at']);
      table.index(['expires_at']);
      table.index(['is_valid']);
    });
  }

  // Table pour les changements hors ligne en attente de synchronisation
  if (!(await knex.schema.hasTable('offline_sync_queue'))) {
    await knex.schema.createTable('offline_sync_queue', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('change_id', 100).notNullable(); // ID unique côté client
      table.string('change_type', 50).notNullable(); // wishlist_add, cart_update, etc.
      table.json('change_data').notNullable(); // Données du changement
      table.string('status', 20).defaultTo('pending'); // pending, processing, synced, failed
      table.text('error_message');
      table.integer('retry_count').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('synced_at');
      
      table.index(['user_id']);
      table.index(['change_type']);
      table.index(['status']);
      table.index(['created_at']);
      table.unique(['user_id', 'change_id']);
    });
  }

  // Table pour les préférences mobiles des utilisateurs
  if (!(await knex.schema.hasTable('mobile_user_preferences'))) {
    await knex.schema.createTable('mobile_user_preferences', (table) => {
      table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
      table.json('push_notification_settings').defaultTo('{}'); // Préférences de notifications
      table.json('offline_cache_preferences').defaultTo('{}'); // Préférences de cache
      table.json('deep_link_preferences').defaultTo('{}'); // Préférences de partage
      table.boolean('allow_analytics').defaultTo(true);
      table.boolean('auto_sync_enabled').defaultTo(true);
      table.integer('cache_size_limit').defaultTo(100); // Limite en MB
      table.timestamps(true, true);
    });
  }

  console.log('✅ Tables de fonctionnalités mobiles créées avec succès');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('mobile_user_preferences');
  await knex.schema.dropTableIfExists('offline_sync_queue');
  await knex.schema.dropTableIfExists('offline_cache_logs');
  await knex.schema.dropTableIfExists('push_notification_logs');
  await knex.schema.dropTableIfExists('deep_link_clicks');
  await knex.schema.dropTableIfExists('deep_links');
  
  // Retirer les colonnes ajoutées à device_tokens (si elles ont été ajoutées)
  // Ignorer cette partie car on n'a pas modifié device_tokens
  
  console.log('❌ Tables de fonctionnalités mobiles supprimées');
};
