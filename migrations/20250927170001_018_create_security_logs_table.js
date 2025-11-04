/**
 * Migration: Table des logs de sécurité pour 2FA et authentification
 * Traçabilité des événements de sécurité
 */

exports.up = function(knex) {
  return knex.schema.createTable('security_logs', function(table) {
    // Clé primaire
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Référence utilisateur
    table.uuid('user_id').notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Type d'événement
    table.string('event_type', 100).notNullable(); // 2FA_ENABLED, 2FA_DISABLED, LOGIN_ATTEMPT, etc.
    table.string('event_category', 50).defaultTo('security'); // security, auth, 2fa
    
    // Détails de l'événement
    table.text('description').nullable();
    table.json('metadata').nullable(); // Données additionnelles (IP, user-agent, etc.)
    
    // Informations contextuelles
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 255).nullable();
    table.string('session_id', 100).nullable();
    
    // Résultat de l'événement
    table.enum('result', ['success', 'failure', 'warning', 'info']).defaultTo('info');
    table.integer('risk_level').defaultTo(0); // 0=low, 1=medium, 2=high, 3=critical
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Index pour les requêtes fréquentes
    table.index(['user_id', 'created_at'], 'idx_security_user_date');
    table.index(['event_type', 'created_at'], 'idx_security_event_date');
    table.index(['result', 'risk_level'], 'idx_security_result_risk');
    table.index('created_at', 'idx_security_created');
    table.index('ip_address', 'idx_security_ip');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('security_logs');
};