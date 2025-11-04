// Test pour vérifier l'import du ticketController
console.log('Test d\'import du ticketController...');

try {
  const ticketController = require('./src/controllers/ticketController');
  console.log('✅ TicketController importé avec succès');
  console.log('Fonctions disponibles:', Object.keys(ticketController));
  console.log('createTicket disponible:', typeof ticketController.createTicket);
  
  if (typeof ticketController.createTicket === 'function') {
    console.log('✅ createTicket est bien une fonction');
  } else {
    console.log('❌ createTicket n\'est pas une fonction:', ticketController.createTicket);
  }
  
} catch (error) {
  console.error('❌ Erreur lors de l\'import:', error.message);
  console.error(error.stack);
}