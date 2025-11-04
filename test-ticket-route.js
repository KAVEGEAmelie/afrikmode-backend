const express = require('express');
const router = express.Router();
const ticketController = require('./src/controllers/ticketController');

console.log('Test ticketController dans route:');
console.log('ticketController:', ticketController);
console.log('createTicket type:', typeof ticketController.createTicket);

// Test simple router.post
router.post('/test', ticketController.createTicket);

console.log('✅ Route POST /test créée avec ticketController.createTicket');

module.exports = router;