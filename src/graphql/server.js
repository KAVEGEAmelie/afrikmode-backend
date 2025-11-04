const { ApolloServer } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

/**
 * Configuration du serveur Apollo GraphQL
 */
class GraphQLServer {
  constructor() {
    this.server = null;
  }

  /**
   * Crée et configure le serveur Apollo
   */
  createServer() {
    this.server = new ApolloServer({
      typeDefs,
      resolvers,
      context: async ({ req }) => {
        // Extraire le token d'authentification
        let user = null;
        const authHeader = req.headers.authorization;

        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
            user = await db('users')
              .where('id', decoded.userId)
              .where('is_active', true)
              .first();
          } catch (error) {
            console.error('Erreur vérification token:', error.message);
          }
        }

        return {
          user,
          db,
          req
        };
      },
      
      // Configuration pour la production
      introspection: process.env.NODE_ENV !== 'production',
      playground: process.env.NODE_ENV !== 'production',
      
      // Gestion des erreurs
      formatError: (error) => {
        console.error('GraphQL Error:', {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: error.extensions
        });

        // Ne pas exposer les détails d'erreur en production
        if (process.env.NODE_ENV === 'production') {
          // Supprimer les détails sensibles
          delete error.extensions.exception;
        }

        return error;
      },

      // Plugins personnalisés
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                console.log(`GraphQL Operation: ${requestContext.request.operationName}`);
              },
              willSendResponse(requestContext) {
                console.log(`GraphQL Response sent for: ${requestContext.request.operationName}`);
              }
            };
          }
        }
      ],

      // Upload de fichiers
      uploads: {
        maxFileSize: 10000000, // 10MB
        maxFiles: 10
      },

      // CORS
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    return this.server;
  }

  /**
   * Applique le middleware GraphQL à Express
   */
  async applyMiddleware(app) {
    if (!this.server) {
      this.createServer();
    }

    await this.server.start();
    this.server.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: false // Désactivé car géré par Express
    });

    console.log(`🚀 GraphQL Server ready at http://localhost:${process.env.PORT || 5000}${this.server.graphqlPath}`);
  }

  /**
   * Démarre le serveur standalone (pour tests)
   */
  async startStandalone(port = 4000) {
    if (!this.server) {
      this.createServer();
    }

    const { url } = await this.server.listen(port);
    console.log(`🚀 GraphQL Server ready at ${url}`);
    return { url, server: this.server };
  }

  /**
   * Arrête le serveur
   */
  async stop() {
    if (this.server) {
      await this.server.stop();
    }
  }
}

// Utilitaires pour les resolvers
const resolverUtils = {
  /**
   * Valide les permissions d'un utilisateur
   */
  requireAuth: (user) => {
    if (!user) {
      throw new AuthenticationError('Authentification requise');
    }
    return user;
  },

  /**
   * Valide le rôle d'un utilisateur
   */
  requireRole: (user, roles) => {
    if (!user) {
      throw new AuthenticationError('Authentification requise');
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Permissions insuffisantes');
    }
    
    return user;
  },

  /**
   * Valide qu'un utilisateur peut accéder à une ressource
   */
  requireOwnership: (user, resourceOwnerId, allowAdmin = true) => {
    if (!user) {
      throw new AuthenticationError('Authentification requise');
    }
    
    if (user.id === resourceOwnerId) {
      return user;
    }
    
    if (allowAdmin && user.role === 'ADMIN') {
      return user;
    }
    
    throw new ForbiddenError('Accès non autorisé à cette ressource');
  },

  /**
   * Génère une pagination
   */
  paginate: (page = 1, per_page = 20) => {
    const limit = Math.min(per_page, 100); // Limite maximum
    const offset = (page - 1) * limit;
    
    return { limit, offset };
  },

  /**
   * Formate les résultats paginés
   */
  formatPaginatedResult: (items, total_count, page, per_page) => {
    const total_pages = Math.ceil(total_count / per_page);
    
    return {
      items,
      total_count,
      page,
      per_page,
      total_pages,
      has_next_page: page < total_pages,
      has_previous_page: page > 1
    };
  },

  /**
   * Nettoie les données d'entrée
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'object' || input === null) {
      return input;
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null && value !== '') {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  },

  /**
   * Génère un slug unique
   */
  generateSlug: async (text, table, id = null) => {
    let slug = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    let finalSlug = slug;
    let counter = 1;

    while (true) {
      let query = db(table).where('slug', finalSlug);
      if (id) {
        query = query.where('id', '!=', id);
      }
      
      const existing = await query.first();
      if (!existing) {
        break;
      }
      
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }
};

module.exports = {
  GraphQLServer: new GraphQLServer(),
  resolverUtils
};