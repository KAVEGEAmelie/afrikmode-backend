/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('system_logs', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('level').notNullable().comment('debug, info, warn, error, critical');
    table.string('category').notNullable().comment('auth, user_action, system, api, security, payment');
    table.string('action').comment('Action spécifique effectuée');
    table.text('message').notNullable().comment('Message de log');
    table.json('metadata').comment('Données additionnelles (JSON)');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL').comment('Utilisateur concerné');
    table.string('user_role').comment('Rôle de l\'utilisateur au moment de l\'action');
    table.string('ip_address').comment('Adresse IP');
    table.string('user_agent').comment('User agent du navigateur');
    table.string('endpoint').comment('Endpoint API appelé');
    table.string('method').comment('Méthode HTTP');
    table.integer('response_status').comment('Code de réponse HTTP');
    table.integer('response_time').comment('Temps de réponse en ms');
    table.string('session_id').comment('ID de session');
    table.json('request_data').comment('Données de la requête (sans mots de passe)');
    table.json('error_stack').comment('Stack trace en cas d\'erreur');
    table.string('environment').defaultTo('development').comment('Environnement (dev, prod, test)');
    table.timestamps(true, true);
    
    // Index pour optimiser les requêtes
    table.index(['level', 'created_at']);
    table.index(['category', 'created_at']);
    table.index(['user_id', 'created_at']);
    table.index(['ip_address', 'created_at']);
    table.index(['endpoint', 'method']);
    table.index(['created_at']); // Pour le nettoyage automatique
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('system_logs');
};