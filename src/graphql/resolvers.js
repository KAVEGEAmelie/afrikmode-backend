const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');

/**
 * Résolveurs GraphQL pour l'API AfrikMode
 */
const resolvers = {
  // =================== SCALAIRES ===================
  DateTime: require('graphql-iso-date').GraphQLDateTime,

  // =================== QUERIES ===================
  Query: {
    // Auth
    me: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('Non authentifié');
      }
      return context.user;
    },

    // Users
    users: async (parent, { page, per_page }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès non autorisé');
      }
      
      const offset = (page - 1) * per_page;
      return await db('users')
        .select('*')
        .limit(per_page)
        .offset(offset)
        .orderBy('created_at', 'desc');
    },

    user: async (parent, { id }, context) => {
      if (!context.user || (context.user.role !== 'ADMIN' && context.user.id !== parseInt(id))) {
        throw new ForbiddenError('Accès non autorisé');
      }
      
      const user = await db('users').where('id', id).first();
      if (!user) {
        throw new UserInputError('Utilisateur non trouvé');
      }
      return user;
    },

    // Stores
    stores: async (parent, { page, per_page }) => {
      const offset = (page - 1) * per_page;
      
      const stores = await db('stores')
        .where('is_active', true)
        .limit(per_page)
        .offset(offset)
        .orderBy('created_at', 'desc');
      
      const total_count = await db('stores')
        .where('is_active', true)
        .count('* as count')
        .first();
      
      return {
        stores,
        total_count: parseInt(total_count.count),
        page,
        per_page,
        total_pages: Math.ceil(total_count.count / per_page)
      };
    },

    store: async (parent, { id }) => {
      const store = await db('stores').where('id', id).where('is_active', true).first();
      if (!store) {
        throw new UserInputError('Boutique non trouvée');
      }
      return store;
    },

    storeBySlug: async (parent, { slug }) => {
      const store = await db('stores').where('slug', slug).where('is_active', true).first();
      if (!store) {
        throw new UserInputError('Boutique non trouvée');
      }
      return store;
    },

    // Categories
    categories: async () => {
      return await db('categories')
        .where('is_active', true)
        .orderBy('name');
    },

    category: async (parent, { id }) => {
      const category = await db('categories').where('id', id).where('is_active', true).first();
      if (!category) {
        throw new UserInputError('Catégorie non trouvée');
      }
      return category;
    },

    categoryBySlug: async (parent, { slug }) => {
      const category = await db('categories').where('slug', slug).where('is_active', true).first();
      if (!category) {
        throw new UserInputError('Catégorie non trouvée');
      }
      return category;
    },

    // Products
    products: async (parent, { filters = {}, page, per_page, sort_by, sort_order }) => {
      const offset = (page - 1) * per_page;
      let query = db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('stores', 'products.store_id', 'stores.id')
        .where('products.is_active', true);

      // Filtres
      if (filters.category_id) {
        query = query.where('products.category_id', filters.category_id);
      }
      if (filters.store_id) {
        query = query.where('products.store_id', filters.store_id);
      }
      if (filters.min_price) {
        query = query.where('products.price', '>=', filters.min_price);
      }
      if (filters.max_price) {
        query = query.where('products.price', '<=', filters.max_price);
      }
      if (filters.in_stock_only) {
        query = query.where('products.stock_quantity', '>', 0);
      }
      if (filters.search) {
        query = query.where(function() {
          this.where('products.name', 'ilike', `%${filters.search}%`)
              .orWhere('products.description', 'ilike', `%${filters.search}%`);
        });
      }

      const products = await query
        .select(
          'products.*',
          'categories.name as category_name',
          'stores.name as store_name'
        )
        .limit(per_page)
        .offset(offset)
        .orderBy(sort_by, sort_order);

      const total_count = await db('products')
        .where('is_active', true)
        .count('* as count')
        .first();

      return {
        products: products.map(product => ({
          ...product,
          images: product.images ? JSON.parse(product.images) : [],
          tags: product.tags ? JSON.parse(product.tags) : [],
          dimensions: product.dimensions ? JSON.parse(product.dimensions) : null
        })),
        total_count: parseInt(total_count.count),
        page,
        per_page,
        total_pages: Math.ceil(total_count.count / per_page)
      };
    },

    product: async (parent, { id }) => {
      const product = await db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('stores', 'products.store_id', 'stores.id')
        .where('products.id', id)
        .where('products.is_active', true)
        .select(
          'products.*',
          'categories.name as category_name',
          'stores.name as store_name'
        )
        .first();

      if (!product) {
        throw new UserInputError('Produit non trouvé');
      }

      return {
        ...product,
        images: product.images ? JSON.parse(product.images) : [],
        tags: product.tags ? JSON.parse(product.tags) : [],
        dimensions: product.dimensions ? JSON.parse(product.dimensions) : null
      };
    },

    productBySlug: async (parent, { slug }) => {
      const product = await db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('stores', 'products.store_id', 'stores.id')
        .where('products.slug', slug)
        .where('products.is_active', true)
        .select(
          'products.*',
          'categories.name as category_name',
          'stores.name as store_name'
        )
        .first();

      if (!product) {
        throw new UserInputError('Produit non trouvé');
      }

      return {
        ...product,
        images: product.images ? JSON.parse(product.images) : [],
        tags: product.tags ? JSON.parse(product.tags) : [],
        dimensions: product.dimensions ? JSON.parse(product.dimensions) : null
      };
    },

    searchProducts: async (parent, { query, page, per_page }) => {
      const offset = (page - 1) * per_page;
      
      const products = await db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('stores', 'products.store_id', 'stores.id')
        .where('products.is_active', true)
        .where(function() {
          this.where('products.name', 'ilike', `%${query}%`)
              .orWhere('products.description', 'ilike', `%${query}%`)
              .orWhere('categories.name', 'ilike', `%${query}%`);
        })
        .select(
          'products.*',
          'categories.name as category_name',
          'stores.name as store_name'
        )
        .limit(per_page)
        .offset(offset)
        .orderBy('products.created_at', 'desc');

      const total_count = await db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .where('products.is_active', true)
        .where(function() {
          this.where('products.name', 'ilike', `%${query}%`)
              .orWhere('products.description', 'ilike', `%${query}%`)
              .orWhere('categories.name', 'ilike', `%${query}%`);
        })
        .count('* as count')
        .first();

      return {
        products: products.map(product => ({
          ...product,
          images: product.images ? JSON.parse(product.images) : [],
          tags: product.tags ? JSON.parse(product.tags) : [],
          dimensions: product.dimensions ? JSON.parse(product.dimensions) : null
        })),
        total_count: parseInt(total_count.count),
        page,
        per_page,
        total_pages: Math.ceil(total_count.count / per_page)
      };
    },

    // Orders
    orders: async (parent, { filters = {}, page, per_page }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès non autorisé');
      }

      const offset = (page - 1) * per_page;
      let query = db('orders')
        .leftJoin('users', 'orders.user_id', 'users.id')
        .leftJoin('stores', 'orders.store_id', 'stores.id');

      // Filtres
      if (filters.status) {
        query = query.where('orders.status', filters.status);
      }
      if (filters.payment_status) {
        query = query.where('orders.payment_status', filters.payment_status);
      }
      if (filters.store_id) {
        query = query.where('orders.store_id', filters.store_id);
      }
      if (filters.customer_id) {
        query = query.where('orders.user_id', filters.customer_id);
      }
      if (filters.start_date) {
        query = query.where('orders.created_at', '>=', filters.start_date);
      }
      if (filters.end_date) {
        query = query.where('orders.created_at', '<=', filters.end_date);
      }

      const orders = await query
        .select(
          'orders.*',
          'users.first_name as customer_first_name',
          'users.last_name as customer_last_name',
          'stores.name as store_name'
        )
        .limit(per_page)
        .offset(offset)
        .orderBy('orders.created_at', 'desc');

      const total_count = await db('orders')
        .count('* as count')
        .first();

      return {
        orders: orders.map(order => ({
          ...order,
          shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
          billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
        })),
        total_count: parseInt(total_count.count),
        page,
        per_page,
        total_pages: Math.ceil(total_count.count / per_page)
      };
    },

    order: async (parent, { id }, context) => {
      if (!context.user) {
        throw new AuthenticationError('Non authentifié');
      }

      const order = await db('orders')
        .leftJoin('users', 'orders.user_id', 'users.id')
        .leftJoin('stores', 'orders.store_id', 'stores.id')
        .where('orders.id', id)
        .select(
          'orders.*',
          'users.first_name as customer_first_name',
          'users.last_name as customer_last_name',
          'stores.name as store_name'
        )
        .first();

      if (!order) {
        throw new UserInputError('Commande non trouvée');
      }

      // Vérifier les permissions
      if (context.user.role !== 'ADMIN' && order.user_id !== context.user.id) {
        throw new ForbiddenError('Accès non autorisé');
      }

      return {
        ...order,
        shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
        billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
      };
    },

    myOrders: async (parent, { page, per_page }, context) => {
      if (!context.user) {
        throw new AuthenticationError('Non authentifié');
      }

      const offset = (page - 1) * per_page;
      
      const orders = await db('orders')
        .leftJoin('stores', 'orders.store_id', 'stores.id')
        .where('orders.user_id', context.user.id)
        .select(
          'orders.*',
          'stores.name as store_name'
        )
        .limit(per_page)
        .offset(offset)
        .orderBy('orders.created_at', 'desc');

      const total_count = await db('orders')
        .where('user_id', context.user.id)
        .count('* as count')
        .first();

      return {
        orders: orders.map(order => ({
          ...order,
          shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
          billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
        })),
        total_count: parseInt(total_count.count),
        page,
        per_page,
        total_pages: Math.ceil(total_count.count / per_page)
      };
    },

    // Reviews
    reviews: async (parent, { product_id, page, per_page }) => {
      const offset = (page - 1) * per_page;
      
      return await db('reviews')
        .leftJoin('users', 'reviews.user_id', 'users.id')
        .where('reviews.product_id', product_id)
        .where('reviews.is_approved', true)
        .select(
          'reviews.*',
          'users.first_name',
          'users.last_name'
        )
        .limit(per_page)
        .offset(offset)
        .orderBy('reviews.created_at', 'desc');
    },

    review: async (parent, { id }, context) => {
      const review = await db('reviews')
        .leftJoin('users', 'reviews.user_id', 'users.id')
        .where('reviews.id', id)
        .select(
          'reviews.*',
          'users.first_name',
          'users.last_name'
        )
        .first();

      if (!review) {
        throw new UserInputError('Avis non trouvé');
      }

      return review;
    },

    // Stats
    dashboardStats: async (parent, args, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès non autorisé');
      }

      const [products, orders, revenue, customers] = await Promise.all([
        db('products').count('* as count').first(),
        db('orders').count('* as count').first(),
        db('orders').where('status', 'delivered').sum('total_amount as total').first(),
        db('users').where('role', 'customer').count('* as count').first()
      ]);

      const recentOrders = await db('orders')
        .leftJoin('users', 'orders.user_id', 'users.id')
        .leftJoin('stores', 'orders.store_id', 'stores.id')
        .select(
          'orders.*',
          'users.first_name as customer_first_name',
          'users.last_name as customer_last_name',
          'stores.name as store_name'
        )
        .orderBy('orders.created_at', 'desc')
        .limit(10);

      const topProducts = await db('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select('products.*')
        .sum('order_items.quantity as total_sold')
        .groupBy('products.id')
        .orderBy('total_sold', 'desc')
        .limit(10);

      return {
        total_products: parseInt(products.count),
        total_orders: parseInt(orders.count),
        total_revenue: parseFloat(revenue.total) || 0,
        total_customers: parseInt(customers.count),
        recent_orders: recentOrders.map(order => ({
          ...order,
          shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
          billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
        })),
        top_products: topProducts.map(product => ({
          ...product,
          images: product.images ? JSON.parse(product.images) : [],
          tags: product.tags ? JSON.parse(product.tags) : []
        }))
      };
    },

    productStats: async (parent, { id }, context) => {
      const [sales, reviews] = await Promise.all([
        db('order_items')
          .leftJoin('orders', 'order_items.order_id', 'orders.id')
          .where('order_items.product_id', id)
          .where('orders.status', 'delivered')
          .select()
          .sum('order_items.quantity as total_sales')
          .sum('order_items.total_price as revenue')
          .first(),
        db('reviews')
          .where('product_id', id)
          .where('is_approved', true)
          .select()
          .avg('rating as avg_rating')
          .count('* as review_count')
          .first()
      ]);

      return {
        total_views: 0, // À implémenter avec un système de tracking
        total_sales: parseInt(sales.total_sales) || 0,
        revenue: parseFloat(sales.revenue) || 0,
        average_rating: parseFloat(reviews.avg_rating) || 0,
        review_count: parseInt(reviews.review_count)
      };
    }
  },

  // =================== MUTATIONS ===================
  Mutation: {
    // Auth
    register: async (parent, { input }) => {
      try {
        // Vérifier si l'utilisateur existe
        const existingUser = await db('users').where('email', input.email).first();
        if (existingUser) {
          throw new UserInputError('Cet email est déjà utilisé');
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(input.password, 12);

        // Créer l'utilisateur
        const [user] = await db('users').insert({
          ...input,
          password: hashedPassword
        }).returning('*');

        // Générer le token
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          success: true,
          message: 'Compte créé avec succès',
          token,
          user
        };
      } catch (error) {
        return {
          success: false,
          message: error.message
        };
      }
    },

    login: async (parent, { email, password }) => {
      try {
        // Trouver l'utilisateur
        const user = await db('users').where('email', email).first();
        if (!user) {
          throw new UserInputError('Email ou mot de passe incorrect');
        }

        // Vérifier le mot de passe
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new UserInputError('Email ou mot de passe incorrect');
        }

        // Vérifier si le compte est actif
        if (!user.is_active) {
          throw new UserInputError('Compte désactivé');
        }

        // Générer le token
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          success: true,
          message: 'Connexion réussie',
          token,
          user
        };
      } catch (error) {
        return {
          success: false,
          message: error.message
        };
      }
    },

    logout: () => {
      return {
        success: true,
        message: 'Déconnexion réussie'
      };
    },

    // Users
    updateProfile: async (parent, { input }, context) => {
      if (!context.user) {
        throw new AuthenticationError('Non authentifié');
      }

      const [updatedUser] = await db('users')
        .where('id', context.user.id)
        .update({
          ...input,
          updated_at: new Date()
        })
        .returning('*');

      return updatedUser;
    },

    deleteAccount: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('Non authentifié');
      }

      await db('users')
        .where('id', context.user.id)
        .update({
          is_active: false,
          updated_at: new Date()
        });

      return {
        success: true,
        message: 'Compte supprimé avec succès'
      };
    }

    // Les autres mutations seraient implémentées de la même manière...
    // (createStore, updateStore, createProduct, etc.)
  },

  // =================== RELATIONS ===================
  User: {
    orders: async (user) => {
      return await db('orders').where('user_id', user.id);
    },
    reviews: async (user) => {
      return await db('reviews').where('user_id', user.id);
    },
    store: async (user) => {
      return await db('stores').where('owner_id', user.id).first();
    }
  },

  Store: {
    owner: async (store) => {
      return await db('users').where('id', store.owner_id).first();
    },
    products: async (store) => {
      return await db('products').where('store_id', store.id);
    },
    orders: async (store) => {
      return await db('orders').where('store_id', store.id);
    }
  },

  Category: {
    parent: async (category) => {
      if (!category.parent_id) return null;
      return await db('categories').where('id', category.parent_id).first();
    },
    children: async (category) => {
      return await db('categories').where('parent_id', category.id);
    },
    products: async (category) => {
      return await db('products').where('category_id', category.id);
    }
  },

  Product: {
    store: async (product) => {
      return await db('stores').where('id', product.store_id).first();
    },
    category: async (product) => {
      return await db('categories').where('id', product.category_id).first();
    },
    reviews: async (product) => {
      return await db('reviews').where('product_id', product.id).where('is_approved', true);
    },
    order_items: async (product) => {
      return await db('order_items').where('product_id', product.id);
    },
    average_rating: async (product) => {
      const result = await db('reviews')
        .where('product_id', product.id)
        .where('is_approved', true)
        .avg('rating as avg')
        .first();
      return parseFloat(result.avg) || 0;
    },
    review_count: async (product) => {
      const result = await db('reviews')
        .where('product_id', product.id)
        .where('is_approved', true)
        .count('* as count')
        .first();
      return parseInt(result.count);
    },
    is_in_stock: (product) => {
      return product.stock_quantity > 0;
    }
  },

  Order: {
    customer: async (order) => {
      return await db('users').where('id', order.user_id).first();
    },
    store: async (order) => {
      return await db('stores').where('id', order.store_id).first();
    },
    items: async (order) => {
      return await db('order_items').where('order_id', order.id);
    },
    payments: async (order) => {
      return await db('payments').where('order_id', order.id);
    }
  },

  OrderItem: {
    order: async (item) => {
      return await db('orders').where('id', item.order_id).first();
    },
    product: async (item) => {
      return await db('products').where('id', item.product_id).first();
    }
  },

  Payment: {
    order: async (payment) => {
      return await db('orders').where('id', payment.order_id).first();
    }
  },

  Review: {
    product: async (review) => {
      return await db('products').where('id', review.product_id).first();
    },
    user: async (review) => {
      return await db('users').where('id', review.user_id).first();
    }
  }
};

module.exports = resolvers;