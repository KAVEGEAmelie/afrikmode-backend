/**
 * Migration: Create ticket_messages table for support conversations
 * Date: 2024-09-27
 */

exports.up = function(knex) {
  return knex.schema.createTable('ticket_messages', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Ticket reference
    table.uuid('ticket_id').notNullable();
    table.foreign('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
    
    // Author of the message
    table.uuid('user_id').notNullable();
    table.foreign('user_id').references('id').inTable('users');
    
    // Message content
    table.text('message').notNullable();
    
    // Message type
    table.enum('message_type', [
      'customer_message',     // Message du client
      'agent_response',       // Réponse de l'agent
      'system_note',          // Note système (changement statut, etc.)
      'internal_note',        // Note interne (visible agents seulement)
      'auto_response'         // Réponse automatique
    ]).defaultTo('customer_message');
    
    // Visibility
    table.boolean('is_public').defaultTo(true); // Visible au client
    table.boolean('is_internal').defaultTo(false); // Note interne seulement
    
    // Attachments
    table.json('attachments').defaultTo('[]');
    
    // Message metadata
    table.json('metadata').defaultTo('{}'); // IP, user agent, etc.
    
    // Read status
    table.boolean('read_by_customer').defaultTo(false);
    table.boolean('read_by_agent').defaultTo(false);
    table.timestamp('read_at').nullable();
    
    // Email integration
    table.string('email_message_id', 255).nullable();
    
    // Multi-tenant support
    table.uuid('tenant_id').nullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['ticket_id']);
    table.index(['user_id']);
    table.index(['message_type']);
    table.index(['created_at']);
    table.index(['tenant_id']);
    table.index(['deleted_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ticket_messages');
};