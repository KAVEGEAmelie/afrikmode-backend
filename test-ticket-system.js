/**
 * Test du système de support client
 * À exécuter pour vérifier le bon fonctionnement
 */

const { Pool } = require('pg');

// Configuration de test
const testConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'afrikmode',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

async function testTicketSystem() {
  console.log('\n🎫 TEST DU SYSTÈME DE SUPPORT CLIENT');
  console.log('=====================================');

  try {
    // Test de connexion base de données
    console.log('\n1. Test de connexion à la base de données...');
    const pool = new Pool(testConfig);
    await pool.query('SELECT NOW()');
    console.log('✅ Connexion base de données OK');

    // Test des migrations
    console.log('\n2. Vérification des tables...');
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tickets', 'ticket_messages');
    `);
    
    if (tablesResult.rows.length === 2) {
      console.log('✅ Tables tickets et ticket_messages créées');
    } else {
      console.log('❌ Tables manquantes - Exécutez les migrations :');
      console.log('   npx knex migrate:latest');
      return;
    }

    // Test structure table tickets
    const ticketsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tickets'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n3. Structure table tickets :');
    ticketsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Test structure table ticket_messages
    const messagesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ticket_messages'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n4. Structure table ticket_messages :');
    messagesColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    await pool.end();

    // Test des modules
    console.log('\n5. Test des modules Node.js...');
    
    try {
      const Ticket = require('./src/models/Ticket');
      console.log('✅ Modèle Ticket chargé');
      
      const ticketController = require('./src/controllers/ticketController');
      console.log('✅ Contrôleur ticket chargé');
      
      const ticketRoutes = require('./src/routes/tickets');
      console.log('✅ Routes tickets chargées');
      
      const chatService = require('./src/services/chatService');
      console.log('✅ Service chat chargé');
      
      const emailService = require('./src/services/emailService');
      console.log('✅ Service email chargé');
      
      const ticketEmailTemplates = require('./src/services/ticketEmailTemplates');
      console.log('✅ Templates email tickets chargés');
      
    } catch (error) {
      console.log(`❌ Erreur module: ${error.message}`);
      return;
    }

    // Test Socket.io
    console.log('\n6. Vérification Socket.io...');
    try {
      const socketio = require('socket.io');
      console.log('✅ Socket.io installé et disponible');
    } catch (error) {
      console.log('❌ Socket.io non installé - Exécutez: npm install socket.io');
    }

    console.log('\n🎉 SYSTÈME DE SUPPORT CLIENT PRÊT !');
    console.log('=====================================');
    console.log('\n📋 Pour démarrer le serveur :');
    console.log('   npm start ou node src/server.js');
    console.log('\n🌐 Endpoints disponibles :');
    console.log('   POST   /api/tickets          - Créer un ticket');
    console.log('   GET    /api/tickets          - Liste des tickets');
    console.log('   GET    /api/tickets/:id      - Détails d\'un ticket');
    console.log('   POST   /api/tickets/:id/assign - Assigner un ticket');
    console.log('   PUT    /api/tickets/:id/status - Changer le statut');
    console.log('   POST   /api/tickets/:id/messages - Ajouter un message');
    console.log('   GET    /api/tickets/:id/messages - Messages du ticket');
    console.log('   GET    /api/tickets/stats     - Statistiques');
    console.log('\n💬 Chat en temps réel :');
    console.log('   Se connecter au serveur Socket.io');
    console.log('   Rejoindre room: ticket_[ID]');
    console.log('   Événements: message, typing, status_update');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.log('\n🔧 Actions à effectuer :');
    console.log('1. Vérifiez la configuration de la base de données');
    console.log('2. Exécutez les migrations: npx knex migrate:latest');
    console.log('3. Installez les dépendances: npm install');
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testTicketSystem();
}

module.exports = { testTicketSystem };