console.log('Test des imports du fichier tickets.js...');

// Test 1: imports de base
const express = require('express');
console.log('✅ express importé');

const router = express.Router();
console.log('✅ router créé');

// Test 2: ticketController
const ticketController = require('./src/controllers/ticketController');
console.log('✅ ticketController importé');

// Test 3: middleware auth
try {
  const { requireAuth, requireRole } = require('./src/middleware/auth');
  console.log('✅ auth middleware importé');
  console.log('requireAuth type:', typeof requireAuth);
} catch (error) {
  console.error('❌ Erreur auth middleware:', error.message);
}

// Test 4: validation
try {
  const { body, param, query } = require('express-validator');
  console.log('✅ express-validator importé');
} catch (error) {
  console.error('❌ Erreur express-validator:', error.message);
}

// Test 5: validation middleware
try {
  const { validateRequest } = require('./src/middleware/validation');
  console.log('✅ validation middleware importé');
  console.log('validateRequest type:', typeof validateRequest);
} catch (error) {
  console.error('❌ Erreur validation middleware:', error.message);
}

// Test 6: rateLimiter
try {
  const { generalLimiter } = require('./src/middleware/rateLimiter');
  console.log('✅ rateLimiter importé');
  console.log('generalLimiter type:', typeof generalLimiter);
} catch (error) {
  console.error('❌ Erreur rateLimiter:', error.message);
}