const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Configuration minimale pour test
const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Routes de base
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'AfrikMode API Test Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test des routes mobiles
const mobileRoutes = require('./src/routes/mobile');
app.use('/api/mobile', mobileRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🧪 Test Server running on http://localhost:${PORT}`);
  console.log('  GET  /health');
  console.log('  POST /api/mobile/push/register');
  console.log('  POST /api/mobile/deeplink/create');
  console.log('  POST /api/mobile/offline/cache');
});

module.exports = app;