/**
 * Migration: Create referrals system tables
 * Date: 2024-09-27
 */

exports.up = async function(knex) {
  // Table des codes de parrainage
  await knex.schema.createTable('referral_codes', function (table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Relations
    table.uuid('referrer_id').notNullable(); // Utilisateur qui fait le parrainage
    table.uuid('tenant_id').notNullable(); // Multi-tenant
    
    // Code de parrainage
    table.string('code', 20).notNullable().unique(); // Code unique AFRIKMODE2024
    table.string('type', 50).defaultTo('user'); // 'user', 'store', 'product', 'campaign'
    
    // Configuration du parrainage
    table.integer('max_uses').defaultTo(50); // Utilisation maximale
    table.integer('current_uses').defaultTo(0); // Utilisations actuelles
    table.timestamp('expires_at').nullable(); // Date d'expiration (optionnel)
    
    // Récompenses configuration
    table.decimal('referrer_bonus', 10, 2).defaultTo(0); // Bonus pour le parrain
    table.decimal('referred_bonus', 10, 2).defaultTo(0); // Bonus pour le parrainé
    table.string('bonus_type', 50).defaultTo('points'); // 'points', 'currency', 'percentage', 'coupon'
    
    // Conditions d'activation
    table.decimal('minimum_order_amount', 10, 2).defaultTo(0); // Commande min pour activation
    table.boolean('requires_first_purchase').defaultTo(true); // Nécessite un premier achat
    
    // Status et metadata
    table.boolean('is_active').defaultTo(true);
    table.json('metadata').defaultTo('{}'); // Données additionnelles
    
    // Timestamps
    table.timestamps(true, true);
    
    // Index pour performance
    table.index(['referrer_id'], 'referral_codes_referrer_index');
    table.index(['code'], 'referral_codes_code_index');
    table.index(['is_active'], 'referral_codes_active_index');
    table.index(['expires_at'], 'referral_codes_expires_index');
    table.index(['tenant_id'], 'referral_codes_tenant_index');
    
    // Foreign keys
    table.foreign('referrer_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('tenant_id').references('id').inTable('users').onDelete('CASCADE');
  });
  
  // Table des parrainages effectués
  await knex.schema.createTable('referrals', function (table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Relations
    table.uuid('referral_code_id').notNullable(); // Code utilisé
    table.uuid('referrer_id').notNullable(); // Parrain
    table.uuid('referred_id').notNullable(); // Parrainé
    table.uuid('tenant_id').notNullable(); // Multi-tenant
    
    // Status du parrainage
    table.enu('status', ['pending', 'active', 'completed', 'expired', 'cancelled']).defaultTo('pending');
    
    // Tracking des étapes
    table.timestamp('referred_at').defaultTo(knex.fn.now()); // Date du parrainage
    table.timestamp('registered_at').nullable(); // Date d'inscription du parrainé
    table.timestamp('first_purchase_at').nullable(); // Date du premier achat
    table.timestamp('bonus_awarded_at').nullable(); // Date d'attribution du bonus
    
    // Récompenses attribuées
    table.decimal('referrer_bonus_awarded', 10, 2).defaultTo(0);
    table.decimal('referred_bonus_awarded', 10, 2).defaultTo(0);
    table.string('bonus_type').nullable();
    
    // Commandes liées
    table.uuid('triggering_order_id').nullable(); // Commande qui a déclenché le bonus
    table.decimal('triggering_order_amount', 10, 2).defaultTo(0);
    
    // Tracking et analytics
    table.string('source', 100).nullable(); // Source du parrainage (email, social, direct)
    table.string('campaign', 100).nullable(); // Campagne associée
    table.json('tracking_data').defaultTo('{}'); // UTM et autres données
    
    // Timestamps
    table.timestamps(true, true);
    
    // Index pour performance
    table.index(['referrer_id'], 'referrals_referrer_index');
    table.index(['referred_id'], 'referrals_referred_index');
    table.index(['referral_code_id'], 'referrals_code_index');
    table.index(['status'], 'referrals_status_index');
    table.index(['referred_at'], 'referrals_date_index');
    table.index(['tenant_id'], 'referrals_tenant_index');
    
    // Foreign keys
    table.foreign('referral_code_id').references('id').inTable('referral_codes').onDelete('CASCADE');
    table.foreign('referrer_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('referred_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('triggering_order_id').references('id').inTable('orders').onDelete('SET NULL');
    table.foreign('tenant_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Contraintes uniques
    table.unique(['referrer_id', 'referred_id'], 'referrals_unique_pair');
  });
  
  // Table des récompenses de parrainage
  await knex.schema.createTable('referral_rewards', function (table) {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Relations
    table.uuid('referral_id').notNullable(); // Parrainage concerné
    table.uuid('user_id').notNullable(); // Bénéficiaire
    table.uuid('tenant_id').notNullable();
    
    // Détails de la récompense
    table.string('reward_type', 50).notNullable(); // 'points', 'currency', 'coupon', 'discount'
    table.decimal('amount', 10, 2).notNullable(); // Montant de la récompense
    table.string('currency', 5).defaultTo('FCFA'); // Devise
    
    // Status et attribution
    table.enu('status', ['pending', 'awarded', 'used', 'expired']).defaultTo('pending');
    table.timestamp('awarded_at').nullable();
    table.timestamp('used_at').nullable();
    table.timestamp('expires_at').nullable();
    
    // Référence externe (coupon, transaction, etc.)
    table.string('external_reference').nullable(); // ID coupon créé, transaction, etc.
    table.json('metadata').defaultTo('{}');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Index
    table.index(['user_id'], 'referral_rewards_user_index');
    table.index(['referral_id'], 'referral_rewards_referral_index');
    table.index(['status'], 'referral_rewards_status_index');
    table.index(['tenant_id'], 'referral_rewards_tenant_index');
    
    // Foreign keys
    table.foreign('referral_id').references('id').inTable('referrals').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('tenant_id').references('id').inTable('users').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('referral_rewards')
    .dropTable('referrals')
    .dropTable('referral_codes');
};