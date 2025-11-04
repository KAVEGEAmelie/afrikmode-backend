const knex = require('knex');
const knexConfig = require('../../knexfile');

/**
 * Configuration de la base de données
 */
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Créer l'instance Knex
const db = knex(config);

/**
 * Test de connexion à la base de données
 */
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Connexion à la base de données établie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    return false;
  }
};

/**
 * Fermer la connexion à la base de données
 */
const closeConnection = async () => {
  try {
    await db.destroy();
    console.log('✅ Connexion à la base de données fermée');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de la connexion:', error.message);
  }
};

/**
 * Middleware pour gérer les erreurs de base de données
 */
const handleDatabaseError = (error) => {
  console.error('Erreur base de données:', error);
  
  // Erreurs PostgreSQL communes
  switch (error.code) {
    case '23505': // Violation de contrainte unique
      return {
        message: 'Cette ressource existe déjà',
        code: 'DUPLICATE_ENTRY',
        statusCode: 409
      };
    
    case '23503': // Violation de clé étrangère
      return {
        message: 'Référence invalide',
        code: 'FOREIGN_KEY_VIOLATION',
        statusCode: 400
      };
    
    case '23502': // Violation de contrainte NOT NULL
      return {
        message: 'Champ requis manquant',
        code: 'NOT_NULL_VIOLATION',
        statusCode: 400
      };
    
    case '42P01': // Table n'existe pas
      return {
        message: 'Erreur de configuration de base de données',
        code: 'TABLE_NOT_FOUND',
        statusCode: 500
      };
    
    case 'ECONNREFUSED':
      return {
        message: 'Impossible de se connecter à la base de données',
        code: 'DATABASE_CONNECTION_ERROR',
        statusCode: 503
      };
    
    default:
    return {
        message: 'Erreur de base de données',
        code: 'DATABASE_ERROR',
        statusCode: 500
      };
  }
};

/**
 * Transaction helper
 */
const transaction = async (callback) => {
  const trx = await db.transaction();
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
};

/**
 * Pagination helper avec comptage total
 */
const paginate = async (query, page = 1, limit = 10) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;
  
  // Clone la requête pour le comptage
  const countQuery = query.clone();
  
  // Exécuter le comptage et la requête paginée en parallèle
  const [countResult, data] = await Promise.all([
    countQuery.clearSelect().clearOrder().count('* as count').first(),
    query.limit(limitNum).offset(offset)
  ]);
  
  const total = parseInt(countResult.count) || 0;
  const pages = Math.ceil(total / limitNum);
  
  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages,
      hasNextPage: pageNum < pages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Soft delete helper
 */
const softDelete = (table, id) => {
    return db(table)
    .where({ id })
      .update({
        deleted_at: db.fn.now(),
      updated_at: db.fn.now()
    });
};

/**
 * Restore helper
 */
const restore = (table, id) => {
    return db(table)
    .where({ id })
      .update({
        deleted_at: null,
      updated_at: db.fn.now()
    });
};

/**
 * Audit trail helper
 */
const auditTrail = (table, id, action, userId, changes = {}) => {
  return db('audit_logs').insert({
    table_name: table,
    record_id: id,
    action: action,
    user_id: userId,
    changes: JSON.stringify(changes),
    created_at: db.fn.now()
  });
};

/**
 * Health check
 */
const healthCheck = async () => {
  try {
    const result = await db.raw('SELECT 1 as health');
    const connectionCount = await db.raw('SELECT count(*) as connections FROM pg_stat_activity');
    
    return {
      status: 'healthy',
      database: 'connected',
      connectionCount: connectionCount.rows[0].connections,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Gestion des signaux de fermeture
process.on('SIGINT', async () => {
  console.log('🔄 Fermeture de la connexion à la base de données...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Fermeture de la connexion à la base de données...');
  await closeConnection();
  process.exit(0);
});

module.exports = db;

// Export nommés pour compatibilité
module.exports.db = db;
module.exports.testConnection = testConnection;
module.exports.closeConnection = closeConnection;
module.exports.handleDatabaseError = handleDatabaseError;
module.exports.transaction = transaction;
module.exports.paginate = paginate;
module.exports.softDelete = softDelete;
module.exports.restore = restore;
module.exports.auditTrail = auditTrail;
module.exports.healthCheck = healthCheck;