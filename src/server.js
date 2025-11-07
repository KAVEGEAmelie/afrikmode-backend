const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const ChatService = require('./services/chatService');
const i18nMiddleware = require('./middleware/i18n');
const currencyMiddleware = require('./middleware/currency');
require('dotenv').config({ path: './config.env' });

// Initialiser les services de rapports programmés
const scheduledReportService = require('./services/scheduledReportService');
const reportService = require('./services/reportService');
const cron = require('node-cron');

// Initialiser les services de sécurité avancés
const systemLogService = require('./services/systemLogService');
const systemMonitoringService = require('./services/systemMonitoringService');
const advancedRateLimitService = require('./services/advancedRateLimitService');

// Swagger documentation
const { setupSwagger } = require('./config/swagger');

// GraphQL server
const { GraphQLServer } = require('./graphql/server');

// Webhook service
const webhookService = require('./services/webhookService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Configuration Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialiser le service de chat
const chatService = new ChatService(io);

// Programmation de tâches de maintenance
// Nettoyage des rapports expirés tous les jours à 2h du matin
cron.schedule('0 2 * * *', async () => {
  try {
    const deletedCount = await reportService.cleanExpiredReports();
    console.log(`🧹 Maintenance: ${deletedCount} rapport(s) expiré(s) supprimé(s)`);
    
    await systemLogService.info(
      systemLogService.categories.SYSTEM,
      `Nettoyage automatique des rapports expirés`,
      { deleted_count: deletedCount }
    );
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des rapports expirés:', error);
    
    await systemLogService.error(
      systemLogService.categories.SYSTEM,
      'Erreur lors du nettoyage automatique des rapports expirés',
      { error: error.message },
      null,
      error
    );
  }
}, {
  timezone: 'Europe/Paris'
});

// Nettoyage des anciens logs tous les dimanches à 3h du matin
cron.schedule('0 3 * * 0', async () => {
  try {
    const deletedCount = await systemLogService.cleanOldLogs(30);
    console.log(`🧹 Maintenance: ${deletedCount} anciens logs supprimés`);
    
    await systemLogService.info(
      systemLogService.categories.SYSTEM,
      `Nettoyage automatique des anciens logs`,
      { deleted_count: deletedCount, retention_days: 30 }
    );
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des logs:', error);
    
    await systemLogService.error(
      systemLogService.categories.SYSTEM,
      'Erreur lors du nettoyage automatique des logs',
      { error: error.message },
      null,
      error
    );
  }
}, {
  timezone: 'Europe/Paris'
});

// Vérification des alertes critiques toutes les heures
cron.schedule('0 * * * *', async () => {
  try {
    const alerts = await systemMonitoringService.checkCriticalAlerts();
    if (alerts.length > 0) {
      console.log(`⚠️  ${alerts.length} alerte(s) critique(s) détectée(s)`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des alertes:', error);
  }
}, {
  timezone: 'Europe/Paris'
});

// Configuration des middlewares
app.use(helmet());

// Middleware de rate limiting avancé (temporairement désactivé)
// app.use(advancedRateLimitService.applyRateLimit());

// Middleware de logging des requêtes (temporairement désactivé)
// app.use(systemLogService.requestLogger());

// Middleware de monitoring des requêtes (temporairement désactivé)
// app.use(systemMonitoringService.requestCounter());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
// Configuration pour les uploads d'images (limite de 10MB)
// Middleware conditionnel pour éviter le parsing JSON sur les routes d'upload
app.use((req, res, next) => {
  // Vérifier si c'est une route d'upload de fichier
  const isUploadRoute = req.path.includes('/upload') || 
                       req.path.includes('/images') ||
                       req.path.includes('/avatar') ||
                       req.path.includes('/product-images') ||
                       req.path.includes('/store-images') ||
                       (req.path === '/api/stores' && req.method === 'POST');
  
  if (isUploadRoute) {
    // Pour les routes d'upload, ne pas parser en JSON (multer s'en charge)
    return next();
  }
  
  // Pour les autres routes, parser en JSON
  express.json({ limit: '10mb' })(req, res, next);
});

// Appliquer urlencoded pour toutes les routes (fallback)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuration spécifique pour les uploads de fichiers
const multer = require('multer');
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware d'internationalisation
app.use(i18nMiddleware.middleware());

// Middleware de conversion automatique des devises
app.use(currencyMiddleware.autoConvert());

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
const routes = require('./routes');

// Configuration API avancée
(async () => {
  try {
    // Initialiser les webhooks
    await webhookService.initializeWebhooks();
    
    // Configurer GraphQL
    await GraphQLServer.applyMiddleware(app);
    
    // Configurer la documentation Swagger
    setupSwagger(app);
    
    console.log('✅ Services API avancés initialisés');
  } catch (error) {
    console.error('❌ Erreur initialisation services API:', error);
  }
})();

app.use('/api', routes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} non trouvée`
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  
  // Si l'erreur a déjà un statusCode, l'utiliser
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || 'SERVER_ERROR'
    });
  }
  
  // Sinon, utiliser le middleware d'erreur standard
  const { errorHandler } = require('./middleware/errorHandler');
  return errorHandler(err, req, res, next);
});

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💬 Socket.io chat service enabled`);
  console.log(`� Scheduled reports service initialized`);
  console.log(`�📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n📋 Available endpoints:');
  console.log('  GET  http://localhost:' + PORT + '/health');
  console.log('  POST http://localhost:' + PORT + '/api/auth/register');
  console.log('  POST http://localhost:' + PORT + '/api/auth/login');
  console.log('  GET  http://localhost:' + PORT + '/api/auth/me');
  console.log('  POST http://localhost:' + PORT + '/api/auth/refresh-token');
  console.log('  POST http://localhost:' + PORT + '/api/auth/forgot-password');
  console.log('  POST http://localhost:' + PORT + '/api/auth/reset-password');
  console.log('  POST http://localhost:' + PORT + '/api/auth/change-password');
  console.log('  POST http://localhost:' + PORT + '/api/auth/logout');
  console.log('\n💬 Chat endpoints:');
  console.log('  Socket.io connection: ws://localhost:' + PORT + '/socket.io/');
  console.log('  Events: join_ticket, send_message, typing_start, typing_stop');
  console.log('\n📊 Report endpoints:');
  console.log('  POST http://localhost:' + PORT + '/api/reports/generate');
  console.log('  GET  http://localhost:' + PORT + '/api/reports/history');
  console.log('  POST http://localhost:' + PORT + '/api/reports/scheduled');
  console.log('\n🔒 Security endpoints:');
  console.log('  GET  http://localhost:' + PORT + '/api/security/health/detailed');
  console.log('  GET  http://localhost:' + PORT + '/api/security/dashboard');
  console.log('  GET  http://localhost:' + PORT + '/api/security/logs');
  console.log('\n🖼️ Media endpoints:');
  console.log('  POST http://localhost:' + PORT + '/api/media/upload');
  console.log('  GET  http://localhost:' + PORT + '/api/media');
  console.log('  GET  http://localhost:' + PORT + '/api/media/admin/dashboard');
  console.log('  GET  http://localhost:' + PORT + '/api/media/admin/health');
});

// Initialiser le planificateur de médias
require('./services/mediaScheduler');

module.exports = app;
