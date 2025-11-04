/**
 * Migration: Table des codes OTP pour authentification à deux facteurs
 * Stockage des codes à usage unique envoyés par email
 */

exports.up = function(knex) {
  return knex.schema.createTable('email_otp_codes', function(table) {
    // Clé primaire
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Référence utilisateur
    table.uuid('user_id').notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Code OTP
    table.string('code', 10).notNullable(); // Code à 6-8 chiffres
    table.string('type', 50).notNullable(); // login, enable_2fa, disable_2fa, etc.
    
    // Statut et validation
    table.boolean('is_used').defaultTo(false);
    table.boolean('is_expired').defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    
    // Informations de sécurité
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 255).nullable();
    table.integer('attempts').defaultTo(0); // Tentatives de validation
    table.timestamp('last_attempt_at').nullable();
    
    // Métadonnées
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Index pour les requêtes fréquentes
    table.index(['user_id', 'type'], 'idx_otp_user_type');
    table.index(['code', 'is_used', 'expires_at'], 'idx_otp_validation');
    table.index('expires_at', 'idx_otp_expiry');
    table.index('created_at', 'idx_otp_created');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('email_otp_codes');
};