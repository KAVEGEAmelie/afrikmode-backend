/**
 * Migration: Create tickets table for customer support system
 * Date: 2024-09-27
 */

exports.up = function(knex) {
  return knex.schema.createTable('tickets', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Ticket number for public reference
    table.string('ticket_number', 20).notNullable().unique();
    
    // User who created the ticket
    table.uuid('user_id').notNullable();
    table.foreign('user_id').references('id').inTable('users');
    
    // Agent assigned to the ticket
    table.uuid('assigned_to').nullable();
    table.foreign('assigned_to').references('id').inTable('users');
    
    // Ticket details
    table.string('subject', 300).notNullable();
    table.text('description').notNullable();
    
    // Priority and category
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.enum('category', [
      'order_issue',
      'payment_problem',
      'product_question',
      'account_help',
      'technical_issue',
      'refund_request',
      'shipping_inquiry',
      'general_support',
      'bug_report',
      'feature_request'
    ]).defaultTo('general_support');
    
    // Status workflow
    table.enum('status', [
      'open',           // Nouveau ticket
      'in_progress',    // En cours de traitement
      'pending',        // En attente de réponse client
      'resolved',       // Résolu
      'closed',         // Fermé
      'escalated'       // Escaladé
    ]).defaultTo('open');
    
    // Related order if applicable
    table.uuid('order_id').nullable();
    table.foreign('order_id').references('id').inTable('orders');
    
    // Related product if applicable
    table.uuid('product_id').nullable();
    table.foreign('product_id').references('id').inTable('products');
    
    // Customer satisfaction
    table.integer('satisfaction_rating').nullable(); // 1-5 stars
    table.text('satisfaction_comment').nullable();
    
    // Attachments (JSON array of file URLs)
    table.json('attachments').defaultTo('[]');
    
    // Tags for better organization
    table.json('tags').defaultTo('[]');
    
    // SLA tracking
    table.timestamp('first_response_at').nullable();
    table.timestamp('resolved_at').nullable();
    table.timestamp('closed_at').nullable();
    
    // Email integration
    table.string('email_thread_id', 255).nullable(); // For email integration
    
    // Chat support
    table.boolean('chat_enabled').defaultTo(false);
    table.string('chat_room_id', 50).nullable();
    
    // Department/team assignment
    table.enum('department', [
      'customer_service',
      'technical_support',
      'billing',
      'sales',
      'management'
    ]).defaultTo('customer_service');
    
    // Escalation tracking
    table.integer('escalation_level').defaultTo(0);
    table.uuid('escalated_by').nullable();
    table.foreign('escalated_by').references('id').inTable('users');
    table.timestamp('escalated_at').nullable();
    
    // Response time tracking (in minutes)
    table.integer('first_response_time').nullable();
    table.integer('resolution_time').nullable();
    
    // Multi-tenant support
    table.uuid('tenant_id').nullable();
    
    // Timestamps and audit
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.uuid('created_by').nullable();
    table.uuid('updated_by').nullable();
    
    // Indexes for performance
    table.index(['ticket_number']);
    table.index(['user_id']);
    table.index(['assigned_to']);
    table.index(['status']);
    table.index(['priority']);
    table.index(['category']);
    table.index(['department']);
    table.index(['created_at']);
    table.index(['tenant_id']);
    table.index(['deleted_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('tickets');
};