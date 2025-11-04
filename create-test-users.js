const bcrypt = require('bcrypt');
const knex = require('knex');
const config = require('./knexfile');
const { v4: uuidv4 } = require('uuid');

// Configuration de la base de données
const db = knex(config.development);

async function createTestUsers() {
  try {
    console.log('🚀 Création des utilisateurs de test...');

    // Hash du mot de passe
    const password = await bcrypt.hash('AfrikMode2024!', 12);

    // Utilisateurs à créer
    const testUsers = [
      // Admin
      {
        id: uuidv4(),
        email: 'admin@test.com',
        password_hash: password,
        first_name: 'Admin',
        last_name: 'Test',
        phone: '+228 90 00 00 01',
        role: 'admin',
        status: 'active',
        email_verified: true,
        country: 'TG',
        city: 'Lomé',
        address: 'Quartier Administratif, Lomé',
        preferred_language: 'fr',
        preferred_currency: 'FCFA',
        loyalty_points: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Vendor 1
      {
        id: uuidv4(),
        email: 'vendor@test.com',
        password_hash: password,
        first_name: 'Vendor',
        last_name: 'Test',
        phone: '+228 90 00 00 02',
        role: 'vendor',
        status: 'active',
        email_verified: true,
        country: 'TG',
        city: 'Lomé',
        address: 'Hedzranawoé, Lomé',
        bio: 'Vendeur de test pour les tests d\'interface',
        loyalty_points: 100,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Customer
      {
        id: uuidv4(),
        email: 'customer@test.com',
        password_hash: password,
        first_name: 'Customer',
        last_name: 'Test',
        phone: '+228 90 00 00 03',
        role: 'customer',
        status: 'active',
        email_verified: true,
        country: 'TG',
        city: 'Lomé',
        address: 'Adidogomé, Lomé',
        loyalty_points: 50,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Vérifier si les utilisateurs existent déjà
    for (const user of testUsers) {
      const existingUser = await db('users').where('email', user.email).first();
      if (existingUser) {
        console.log(`⚠️  Utilisateur ${user.email} existe déjà, mise à jour...`);
        await db('users').where('email', user.email).update({
          role: user.role,
          status: user.status,
          email_verified: user.email_verified,
          updated_at: new Date()
        });
      } else {
        console.log(`➕ Création de l'utilisateur ${user.email}...`);
        await db('users').insert(user);
      }
    }

    console.log('✅ Utilisateurs de test créés/mis à jour avec succès !');
    console.log('\n📋 Comptes de test disponibles :');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│                    COMPTES DE TEST                     │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ 🔐 ADMIN                                                │');
    console.log('│   Email: admin@test.com                                │');
    console.log('│   Mot de passe: AfrikMode2024!                        │');
    console.log('│   Rôle: admin                                          │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ 🏪 VENDOR                                               │');
    console.log('│   Email: vendor@test.com                               │');
    console.log('│   Mot de passe: AfrikMode2024!                        │');
    console.log('│   Rôle: vendor                                         │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ 👤 CUSTOMER                                             │');
    console.log('│   Email: customer@test.com                             │');
    console.log('│   Mot de passe: AfrikMode2024!                        │');
    console.log('│   Rôle: customer                                       │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('\n🚀 Tu peux maintenant te connecter avec ces comptes !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des utilisateurs:', error);
  } finally {
    await db.destroy();
  }
}

// Exécuter le script
createTestUsers();
