/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('notifications', function (table) {
    // Colonnes de base
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable(); 
    table.uuid('device_token_id').nullable(); 
    
    // Type et contenu de la notification
    table.string('type', 50).notNullable();
    table.string('title', 200).notNullable(); 
    table.text('body').notNullable(); 
    table.json('data').defaultTo('{}');
    
    // Catégorisation
    table.enum('category', [
      'order', 
      'delivery',
      'payment', 
      'promotion', 
      'product',
      'account', 
      'support', 
      'system', 
      'marketing', 
      'reminder'
    ]).notNullable();
    
    table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
    
    // Contenu multimédia
    table.string('image_url'); 
    table.string('icon_url');
    table.string('sound', 50).defaultTo('default');

    // Configuration d'affichage
    table.json('display_options').defaultTo('{}'); 
    table.string('action_url');
    table.json('actions').defaultTo('[]'); 
    
    // Planification
    table.timestamp('scheduled_at'); 
    table.timestamp('expires_at'); 
    table.boolean('is_scheduled').defaultTo(false); 
    
    // Status d'envoi
    table.enum('status', [
      'draft', 
      'scheduled', 
      'sending', 
      'sent', 
      'delivered', 
      'read', 
      'failed', 
      'expired' 
    ]).defaultTo('draft');
    
    // Informations d'envoi
    table.timestamp('sent_at');     
    table.timestamp('delivered_at'); 
    table.timestamp('read_at'); 
    table.json('delivery_details').defaultTo('{}');
    
    // Tracking et analytics
    table.boolean('clicked').defaultTo(false); 
    table.timestamp('clicked_at');
    table.integer('click_count').defaultTo(0); 
    table.json('interaction_data').defaultTo('{}'); 
    
    // Ciblage et segmentation
    table.json('target_criteria').defaultTo('{}'); 
    table.string('campaign_id'); 
    table.string('batch_id'); 
    
    // Relations avec d'autres entités
    table.uuid('related_order_id').nullable(); 
    table.uuid('related_product_id').nullable(); 
    table.uuid('related_coupon_id').nullable(); 
    table.uuid('related_ticket_id').nullable();
    
    // Métadonnées
    table.uuid('tenant_id').notNullable(); 
    table.uuid('created_by').nullable(); 
    table.timestamps(true, true); 
    
    // Index pour performance
    table.index(['user_id'], 'notifications_user_index');
    table.index(['type'], 'notifications_type_index');
    table.index(['category'], 'notifications_category_index');
    table.index(['status'], 'notifications_status_index');
    table.index(['priority'], 'notifications_priority_index');
    table.index(['sent_at'], 'notifications_sent_date_index');
    table.index(['scheduled_at'], 'notifications_scheduled_index');
    table.index(['is_scheduled'], 'notifications_is_scheduled_index');
    table.index(['tenant_id'], 'notifications_tenant_index');
    table.index(['campaign_id'], 'notifications_campaign_index');
    table.index(['batch_id'], 'notifications_batch_index');
    table.index(['related_order_id'], 'notifications_order_index');
    table.index(['user_id', 'status'], 'notifications_user_status_index');
    table.index(['user_id', 'category'], 'notifications_user_category_index');
    table.index(['created_at'], 'notifications_created_date_index');
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('device_token_id').references('id').inTable('device_tokens').onDelete('SET NULL');
    table.foreign('tenant_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('related_order_id').references('id').inTable('orders').onDelete('SET NULL');
    table.foreign('related_product_id').references('id').inTable('products').onDelete('SET NULL');
    table.foreign('related_coupon_id').references('id').inTable('coupons').onDelete('SET NULL');
    table.foreign('related_ticket_id').references('id').inTable('tickets').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
};