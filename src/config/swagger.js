const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Configuration et définition de la documentation OpenAPI/Swagger
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AfrikMode API',
    version: '1.0.0',
    description: 'API REST complète pour la plateforme e-commerce AfrikMode spécialisée dans la mode africaine',
    contact: {
      name: 'Support AfrikMode',
      email: 'support@afrikmode.com',
      url: 'https://afrikmode.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.BASE_URL || 'http://localhost:5000',
      description: 'Serveur de développement'
    },
    {
      url: 'https://api.afrikmode.com',
      description: 'Serveur de production'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenu via /api/auth/login'
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Clé API pour accès programmatique'
      }
    },
    schemas: {
      // Schémas de base
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Identifiant unique' },
          email: { type: 'string', format: 'email', description: 'Adresse email' },
          first_name: { type: 'string', description: 'Prénom' },
          last_name: { type: 'string', description: 'Nom de famille' },
          phone: { type: 'string', description: 'Numéro de téléphone' },
          avatar_url: { type: 'string', format: 'uri', description: 'URL de l\'avatar' },
          role: { 
            type: 'string', 
            enum: ['customer', 'vendor', 'admin'], 
            description: 'Rôle utilisateur' 
          },
          is_active: { type: 'boolean', description: 'Compte actif' },
          created_at: { type: 'string', format: 'date-time', description: 'Date de création' },
          updated_at: { type: 'string', format: 'date-time', description: 'Date de modification' }
        },
        required: ['id', 'email', 'role', 'is_active']
      },
      
      Store: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Identifiant unique' },
          name: { type: 'string', description: 'Nom de la boutique' },
          description: { type: 'string', description: 'Description' },
          slug: { type: 'string', description: 'Slug URL-friendly' },
          logo_url: { type: 'string', format: 'uri', description: 'URL du logo' },
          banner_url: { type: 'string', format: 'uri', description: 'URL de la bannière' },
          address: { type: 'string', description: 'Adresse' },
          city: { type: 'string', description: 'Ville' },
          country: { type: 'string', description: 'Pays' },
          phone: { type: 'string', description: 'Téléphone' },
          email: { type: 'string', format: 'email', description: 'Email' },
          is_active: { type: 'boolean', description: 'Boutique active' },
          owner_id: { type: 'integer', description: 'ID du propriétaire' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'owner_id', 'is_active']
      },

      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Identifiant unique' },
          name: { type: 'string', description: 'Nom du produit' },
          description: { type: 'string', description: 'Description détaillée' },
          price: { type: 'number', format: 'float', description: 'Prix en euros' },
          compare_at_price: { type: 'number', format: 'float', description: 'Prix de comparaison' },
          sku: { type: 'string', description: 'Code produit' },
          slug: { type: 'string', description: 'Slug URL-friendly' },
          images: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            description: 'URLs des images'
          },
          stock_quantity: { type: 'integer', description: 'Quantité en stock' },
          is_active: { type: 'boolean', description: 'Produit actif' },
          weight: { type: 'number', format: 'float', description: 'Poids en kg' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Étiquettes'
          },
          category_id: { type: 'integer', description: 'ID de la catégorie' },
          store_id: { type: 'integer', description: 'ID de la boutique' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'description', 'price', 'stock_quantity', 'category_id', 'store_id']
      },

      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Identifiant unique' },
          order_number: { type: 'string', description: 'Numéro de commande' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
            description: 'Statut de la commande'
          },
          payment_status: {
            type: 'string',
            enum: ['pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded'],
            description: 'Statut du paiement'
          },
          subtotal: { type: 'number', format: 'float', description: 'Sous-total' },
          tax_amount: { type: 'number', format: 'float', description: 'Montant des taxes' },
          shipping_amount: { type: 'number', format: 'float', description: 'Frais de livraison' },
          total_amount: { type: 'number', format: 'float', description: 'Montant total' },
          currency: { type: 'string', description: 'Devise', default: 'EUR' },
          shipping_address: { $ref: '#/components/schemas/Address' },
          billing_address: { $ref: '#/components/schemas/Address' },
          user_id: { type: 'integer', description: 'ID du client' },
          store_id: { type: 'integer', description: 'ID de la boutique' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'order_number', 'status', 'total_amount', 'user_id', 'store_id']
      },

      Address: {
        type: 'object',
        properties: {
          street: { type: 'string', description: 'Rue' },
          city: { type: 'string', description: 'Ville' },
          state: { type: 'string', description: 'État/Région' },
          postal_code: { type: 'string', description: 'Code postal' },
          country: { type: 'string', description: 'Pays' }
        },
        required: ['street', 'city', 'postal_code', 'country']
      },

      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Identifiant unique' },
          name: { type: 'string', description: 'Nom de la catégorie' },
          description: { type: 'string', description: 'Description' },
          slug: { type: 'string', description: 'Slug URL-friendly' },
          image_url: { type: 'string', format: 'uri', description: 'URL de l\'image' },
          is_active: { type: 'boolean', description: 'Catégorie active' },
          parent_id: { type: 'integer', description: 'ID de la catégorie parent', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'is_active']
      },

      Webhook: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Identifiant unique' },
          name: { type: 'string', description: 'Nom du webhook' },
          url: { type: 'string', format: 'uri', description: 'URL de destination' },
          events: {
            type: 'array',
            items: { type: 'string' },
            description: 'Événements écoutés'
          },
          secret: { type: 'string', description: 'Secret pour signature' },
          headers: { type: 'object', description: 'Headers personnalisés' },
          is_active: { type: 'boolean', description: 'Webhook actif' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'url', 'events', 'is_active']
      },

      // Schémas de réponse
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'Succès de l\'opération' },
          message: { type: 'string', description: 'Message descriptif' },
          data: { description: 'Données de réponse' }
        },
        required: ['success']
      },

      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              items: { type: 'array', description: 'Éléments de la page' },
              total_count: { type: 'integer', description: 'Total d\'éléments' },
              page: { type: 'integer', description: 'Page actuelle' },
              per_page: { type: 'integer', description: 'Éléments par page' },
              total_pages: { type: 'integer', description: 'Total de pages' }
            }
          }
        }
      },

      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Erreurs de validation' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', description: 'Champ en erreur' },
                message: { type: 'string', description: 'Message d\'erreur' }
              }
            }
          }
        }
      }
    },
    
    responses: {
      '200': {
        description: 'Opération réussie',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiResponse' }
          }
        }
      },
      '201': {
        description: 'Ressource créée avec succès',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiResponse' }
          }
        }
      },
      '400': {
        description: 'Requête invalide',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ValidationError' }
          }
        }
      },
      '401': {
        description: 'Non authentifié',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Token d\'authentification requis' }
              }
            }
          }
        }
      },
      '403': {
        description: 'Accès interdit',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Permissions insuffisantes' }
              }
            }
          }
        }
      },
      '404': {
        description: 'Ressource non trouvée',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Ressource non trouvée' }
              }
            }
          }
        }
      },
      '429': {
        description: 'Limite de requêtes dépassée',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Limite de requêtes dépassée' },
                retry_after: { type: 'integer', description: 'Secondes avant nouvelle tentative' }
              }
            }
          }
        }
      },
      '500': {
        description: 'Erreur serveur',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Erreur interne du serveur' }
              }
            }
          }
        }
      }
    }
  },
  
  tags: [
    {
      name: 'Authentication',
      description: 'Gestion de l\'authentification et des sessions'
    },
    {
      name: 'Users',
      description: 'Gestion des utilisateurs'
    },
    {
      name: 'Stores',
      description: 'Gestion des boutiques'
    },
    {
      name: 'Products',
      description: 'Gestion des produits'
    },
    {
      name: 'Categories',
      description: 'Gestion des catégories'
    },
    {
      name: 'Orders',
      description: 'Gestion des commandes'
    },
    {
      name: 'Payments',
      description: 'Gestion des paiements'
    },
    {
      name: 'Analytics',
      description: 'Statistiques et analyses'
    },
    {
      name: 'Reports',
      description: 'Génération de rapports'
    },
    {
      name: 'Newsletter',
      description: 'Gestion des newsletters et campagnes marketing'
    },
    {
      name: 'SEO',
      description: 'Outils SEO et optimisation'
    },
    {
      name: 'Webhooks',
      description: 'Configuration et gestion des webhooks'
    },
    {
      name: 'API Management',
      description: 'Gestion des clés API et monitoring'
    }
  ],

  paths: {
    // Quelques exemples de chemins (le reste serait généré par les annotations dans le code)
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Connexion utilisateur',
        description: 'Authentifie un utilisateur et retourne un token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'password123' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Connexion réussie',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Connexion réussie' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', description: 'Token JWT' },
                        user: { $ref: '#/components/schemas/User' }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/400' },
          '401': { $ref: '#/components/responses/401' }
        }
      }
    },

    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Liste des produits',
        description: 'Récupère une liste paginée de produits avec filtres',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Numéro de page'
          },
          {
            name: 'per_page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Nombre d\'éléments par page'
          },
          {
            name: 'category_id',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Filtrer par catégorie'
          },
          {
            name: 'min_price',
            in: 'query',
            schema: { type: 'number' },
            description: 'Prix minimum'
          },
          {
            name: 'max_price',
            in: 'query',
            schema: { type: 'number' },
            description: 'Prix maximum'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Recherche textuelle'
          }
        ],
        responses: {
          '200': {
            description: 'Liste des produits',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Product' }
                        },
                        total_count: { type: 'integer' },
                        page: { type: 'integer' },
                        per_page: { type: 'integer' },
                        total_pages: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Options pour swagger-jsdoc
const options = {
  definition: swaggerDefinition,
  // Chemins vers les fichiers contenant les annotations Swagger
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

// Génération de la spécification
const specs = swaggerJsdoc(options);

// Configuration pour swagger-ui-express
const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #667eea; }
  `,
  customSiteTitle: "AfrikMode API Documentation",
  customfavIcon: "/assets/favicon.ico"
};

/**
 * Configuration Swagger pour Express
 */
const setupSwagger = (app) => {
  // Servir la documentation Swagger
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Endpoint pour récupérer la spécification JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`📚 Documentation API disponible sur: /api/docs`);
};

module.exports = {
  setupSwagger,
  swaggerSpecs: specs
};