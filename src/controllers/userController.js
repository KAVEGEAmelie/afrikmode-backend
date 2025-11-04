const bcrypt = require('bcrypt');
const db = require('../config/database');
const redis = require('../config/redis');
const { cache, sets, CACHE_KEYS } = redis;
const { asyncHandler, commonErrors } = require('../middleware/errorHandler');
const { uploadService } = require('../services/uploadService');

/**
 * Récupérer le profil de l'utilisateur connecté
 * GET /api/users/profile
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Vérifier le cache
  const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
  const cachedProfile = await cache.get(cacheKey);
  
  if (cachedProfile) {
    return res.json({
      success: true,
      data: cachedProfile
    });
  }
  
  // Récupérer l'utilisateur avec ses boutiques
  const user = await db('users')
    .select([
      'id', 'email', 'first_name', 'last_name', 'phone', 'birth_date',
      'gender', 'avatar_url', 'bio', 'preferred_language', 'preferred_currency',
      'country', 'city', 'address', 'postal_code', 'role', 'status',
      'email_verified', 'phone_verified', 'loyalty_points', 'loyalty_tier',
      'marketing_emails', 'marketing_sms', 'order_notifications',
      'two_factor_enabled', 'last_login', 'created_at'
    ])
    .where({ id: userId })
    .whereNull('deleted_at')
    .first();

  if (!user) {
    throw commonErrors.notFound('Utilisateur');
  }

  // Récupérer les boutiques si l'utilisateur est vendeur
  let stores = [];
  if (['vendor', 'manager', 'admin', 'super_admin'].includes(user.role)) {
    stores = await db('stores')
      .select([
        'id', 'name', 'slug', 'logo_url', 'status', 'is_verified',
        'total_products', 'total_orders', 'average_rating', 'followers_count'
      ])
      .where({ owner_id: userId })
      .whereNull('deleted_at');
  }

  // Statistiques utilisateur
  const stats = await db('orders')
    .select([
      db.raw('COUNT(*) as total_orders'),
      db.raw('SUM(total_amount) as total_spent'),
      db.raw('COUNT(CASE WHEN status = \'delivered\' THEN 1 END) as completed_orders')
    ])
    .where({ customer_id: userId })
    .first();

  const profile = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    phone: user.phone,
    birthDate: user.birth_date,
    gender: user.gender,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    
    // Préférences
    preferences: {
      language: user.preferred_language,
      currency: user.preferred_currency,
      marketing: {
        emails: user.marketing_emails,
        sms: user.marketing_sms,
        orderNotifications: user.order_notifications
      }
    },
    
    // Adresse
    address: {
      country: user.country,
      city: user.city,
      address: user.address,
      postalCode: user.postal_code
    },
    
    // Statut et vérifications
    role: user.role,
    status: user.status,
    verified: {
      email: user.email_verified,
      phone: user.phone_verified
    },
    
    // Fidélité
    loyalty: {
      points: user.loyalty_points || 0,
      tier: user.loyalty_tier || 'bronze'
    },
    
    // Sécurité
    security: {
      twoFactorEnabled: user.two_factor_enabled,
      lastLogin: user.last_login
    },
    
    // Boutiques
    stores: stores.map(store => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      logoUrl: store.logo_url,
      status: store.status,
      isVerified: store.is_verified,
      stats: {
        products: store.total_products || 0,
        orders: store.total_orders || 0,
        rating: store.average_rating ? parseFloat(store.average_rating) : 0,
        followers: store.followers_count || 0
      }
    })),
    
    // Statistiques
    stats: {
      totalOrders: parseInt(stats.total_orders) || 0,
      totalSpent: parseFloat(stats.total_spent) || 0,
      completedOrders: parseInt(stats.completed_orders) || 0
    },
    
    createdAt: user.created_at
  };

  // Mettre en cache
  await cache.set(cacheKey, profile, 1800); // 30 minutes

  res.json({
    success: true,
    data: profile
  });
});

/**
 * Mettre à jour le profil utilisateur
 * PUT /api/users/profile
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    firstName,
    lastName,
    phone,
    birthDate,
    gender,
    bio,
    country,
    city,
    address,
    postalCode,
    preferredLanguage,
    preferredCurrency,
    marketingEmails,
    marketingSms,
    orderNotifications
  } = req.body;

  // Validation des données
  const updateData = {};
  
  if (firstName !== undefined) updateData.first_name = firstName.trim();
  if (lastName !== undefined) updateData.last_name = lastName.trim();
  if (phone !== undefined) updateData.phone = phone;
  if (birthDate !== undefined) updateData.birth_date = birthDate;
  if (gender !== undefined) updateData.gender = gender;
  if (bio !== undefined) updateData.bio = bio;
  if (country !== undefined) updateData.country = country;
  if (city !== undefined) updateData.city = city;
  if (address !== undefined) updateData.address = address;
  if (postalCode !== undefined) updateData.postal_code = postalCode;
  if (preferredLanguage !== undefined) updateData.preferred_language = preferredLanguage;
  if (preferredCurrency !== undefined) updateData.preferred_currency = preferredCurrency;
  if (marketingEmails !== undefined) updateData.marketing_emails = marketingEmails;
  if (marketingSms !== undefined) updateData.marketing_sms = marketingSms;
  if (orderNotifications !== undefined) updateData.order_notifications = orderNotifications;

  // Ajouter les métadonnées de mise à jour
  updateData.updated_at = db.fn.now();
  updateData.updated_by = userId;

  // Mettre à jour l'utilisateur
  const [updatedUser] = await db('users')
    .where({ id: userId })
    .update(updateData)
    .returning('*');

  // Invalider le cache
  await cache.del(CACHE_KEYS.USER_PROFILE(userId));

  res.json({
    success: true,
    message: 'Profil mis à jour avec succès',
    data: {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      updatedAt: updatedUser.updated_at
    }
  });
});

/**
 * Changer le mot de passe
 * PUT /api/users/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw commonErrors.badRequest('Tous les champs sont requis');
  }

  if (newPassword !== confirmPassword) {
    throw commonErrors.badRequest('Les nouveaux mots de passe ne correspondent pas');
  }

  if (newPassword.length < 8) {
    throw commonErrors.badRequest('Le nouveau mot de passe doit contenir au moins 8 caractères');
  }

  // Récupérer l'utilisateur
  const user = await db('users')
    .select(['id', 'password_hash'])
    .where({ id: userId })
    .first();

  if (!user) {
    throw commonErrors.notFound('Utilisateur');
  }

  // Vérifier le mot de passe actuel
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw commonErrors.badRequest('Mot de passe actuel incorrect');
  }

  // Hasher le nouveau mot de passe
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Mettre à jour le mot de passe
  await db('users')
    .where({ id: userId })
    .update({
      password_hash: newPasswordHash,
      updated_at: db.fn.now(),
      updated_by: userId
    });

  res.json({
    success: true,
    message: 'Mot de passe modifié avec succès'
  });
});

/**
 * Upload avatar utilisateur
 * POST /api/users/avatar
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log('🔍 Debug upload avatar:');
  console.log('- req.file:', req.file);
  console.log('- req.files:', req.files);
  console.log('- req.body:', req.body);
  console.log('- Content-Type:', req.get('Content-Type'));
  console.log('- User ID:', userId);

  if (!req.file) {
    console.log('❌ Aucun fichier reçu dans req.file');
    throw commonErrors.badRequest('Aucun fichier fourni');
  }

  try {
    // Traiter l'avatar
    const processedAvatar = await uploadService.processUserAvatar(req.file, userId);
    
    // Mettre à jour l'URL de l'avatar en base
    await db('users')
      .where({ id: userId })
      .update({
        avatar_url: processedAvatar.url,
        updated_at: db.fn.now(),
        updated_by: userId
      });

    // Invalider le cache du profil
    await cache.del(CACHE_KEYS.USER_PROFILE(userId));

    res.json({
      success: true,
      message: 'Avatar mis à jour avec succès',
      data: {
        avatarUrl: processedAvatar.url,
        fileName: processedAvatar.fileName,
        size: processedAvatar.size
      }
    });

  } catch (error) {
    console.error('Erreur upload avatar:', error);
    throw error;
  }
});

/**
 * Récupérer la wishlist de l'utilisateur
 * GET /api/users/wishlist
 */
const getUserWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  // Récupérer les IDs des produits en wishlist depuis Redis
  const wishlistKey = CACHE_KEYS.USER_WISHLIST(userId);
  const productIds = await sets.members(wishlistKey);

  if (productIds.length === 0) {
    return res.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  }

  // Récupérer les détails des produits
  let query = db('products')
    .select([
      'products.id',
      'products.name',
      'products.slug',
      'products.price',
      'products.compare_at_price',
      'products.currency',
      'products.primary_image',
      'products.stock_quantity',
      'products.average_rating',
      'products.reviews_count',
      'products.status',
      'stores.name as store_name',
      'stores.slug as store_slug'
    ])
    .leftJoin('stores', 'products.store_id', 'stores.id')
    .whereIn('products.id', productIds.map(id => JSON.parse(id)))
    .whereNull('products.deleted_at');

  const result = await db.helpers.paginate(query, page, limit);

  // Formater les résultats
  const wishlistItems = result.data.map(product => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: parseFloat(product.price),
    compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
    currency: product.currency,
    primaryImage: product.primary_image,
    stockQuantity: product.stock_quantity,
    averageRating: product.average_rating ? parseFloat(product.average_rating) : 0,
    reviewsCount: product.reviews_count || 0,
    status: product.status,
    available: product.status === 'active' && product.stock_quantity > 0,
    store: {
      name: product.store_name,
      slug: product.store_slug
    }
  }));

  res.json({
    success: true,
    data: wishlistItems,
    pagination: result.pagination
  });
});

/**
 * Ajouter/retirer un produit de la wishlist
 * POST /api/users/wishlist/:productId
 */
const toggleWishlistItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  // Vérifier que le produit existe
  const product = await db('products')
    .select(['id', 'name'])
    .where({ id: productId })
    .whereNull('deleted_at')
    .first();

  if (!product) {
    throw commonErrors.notFound('Produit');
  }

  const wishlistKey = CACHE_KEYS.USER_WISHLIST(userId);
  const isInWishlist = await sets.isMember(wishlistKey, productId);

  if (isInWishlist) {
    // Retirer de la wishlist
    await sets.remove(wishlistKey, productId);
    await db('products')
      .where({ id: productId })
      .decrement('wishlist_count', 1);

    res.json({
      success: true,
      message: `${product.name} retiré de votre liste de souhaits`,
      data: {
        productId,
        inWishlist: false,
        action: 'removed'
      }
    });
  } else {
    // Ajouter à la wishlist
    await sets.add(wishlistKey, productId);
    await db('products')
      .where({ id: productId })
      .increment('wishlist_count', 1);

    res.json({
      success: true,
      message: `${product.name} ajouté à votre liste de souhaits`,
      data: {
        productId,
        inWishlist: true,
        action: 'added'
      }
    });
  }
});

/**
 * Vider la wishlist
 * DELETE /api/users/wishlist
 */
const clearWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const wishlistKey = CACHE_KEYS.USER_WISHLIST(userId);
  const productIds = await sets.members(wishlistKey);

  if (productIds.length > 0) {
    // Décrémenter le compteur de wishlist pour tous les produits
    const parsedIds = productIds.map(id => JSON.parse(id));
    await db('products')
      .whereIn('id', parsedIds)
      .decrement('wishlist_count', 1);

    // Vider la wishlist Redis
    await cache.del(wishlistKey);
  }

  res.json({
    success: true,
    message: 'Liste de souhaits vidée avec succès',
    data: {
      removedCount: productIds.length
    }
  });
});

/**
 * Récupérer les adresses de l'utilisateur
 * GET /api/users/addresses
 */
const getUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await db('user_addresses')
    .where({ user_id: req.user.id })
    .whereNull('deleted_at')
    .orderBy([
      { column: 'is_default', order: 'desc' },
      { column: 'created_at', order: 'desc' }
    ]);

  res.json({
    success: true,
    data: addresses
  });
});

/**
 * Ajouter une nouvelle adresse
 * POST /api/users/addresses
 */
const createUserAddress = asyncHandler(async (req, res) => {
  const {
    first_name,
    last_name,
    phone,
    email,
    address_line_1,
    address_line_2,
    city,
    postal_code,
    country,
    state,
    type,
    is_default,
    label,
    latitude,
    longitude
  } = req.body;

  // Validation
  if (!first_name || !last_name || !phone || !address_line_1 || !city || !postal_code) {
    return res.status(400).json({
      success: false,
      message: 'Tous les champs requis doivent être remplis'
    });
  }

  // Si is_default = true, mettre toutes les autres adresses à false
  if (is_default) {
    await db('user_addresses')
      .where({ user_id: req.user.id })
      .whereNull('deleted_at')
      .update({ is_default: false });
  }

  const [address] = await db('user_addresses')
    .insert({
      user_id: req.user.id,
      first_name,
      last_name,
      phone,
      email: email || null,
      address_line_1,
      address_line_2: address_line_2 || null,
      city,
      postal_code,
      country: country || 'CI',
      state: state || null,
      type: type || 'shipping',
      is_default: is_default || false,
      label: label || null,
      latitude: latitude || null,
      longitude: longitude || null
    })
    .returning('*');

  res.status(201).json({
    success: true,
    message: 'Adresse créée avec succès',
    data: address
  });
});

/**
 * Mettre à jour une adresse
 * PUT /api/users/addresses/:id
 */
const updateUserAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    phone,
    email,
    address_line_1,
    address_line_2,
    city,
    postal_code,
    country,
    state,
    type,
    is_default,
    label,
    latitude,
    longitude
  } = req.body;

  // Vérifier que l'adresse appartient à l'utilisateur
  const address = await db('user_addresses')
    .where({ id, user_id: req.user.id })
    .whereNull('deleted_at')
    .first();

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Adresse non trouvée'
    });
  }

  // Si is_default = true, mettre toutes les autres adresses à false
  if (is_default) {
    await db('user_addresses')
      .where({ user_id: req.user.id })
      .whereNull('deleted_at')
      .whereNot('id', id)
      .update({ is_default: false });
  }

  const updateData = {};
  if (first_name) updateData.first_name = first_name;
  if (last_name) updateData.last_name = last_name;
  if (phone) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (address_line_1) updateData.address_line_1 = address_line_1;
  if (address_line_2 !== undefined) updateData.address_line_2 = address_line_2;
  if (city) updateData.city = city;
  if (postal_code) updateData.postal_code = postal_code;
  if (country) updateData.country = country;
  if (state !== undefined) updateData.state = state;
  if (type) updateData.type = type;
  if (is_default !== undefined) updateData.is_default = is_default;
  if (label !== undefined) updateData.label = label;
  if (latitude !== undefined) updateData.latitude = latitude;
  if (longitude !== undefined) updateData.longitude = longitude;

  const [updated] = await db('user_addresses')
    .where({ id })
    .update(updateData)
    .returning('*');

  res.json({
    success: true,
    message: 'Adresse mise à jour avec succès',
    data: updated
  });
});

/**
 * Supprimer une adresse
 * DELETE /api/users/addresses/:id
 */
const deleteUserAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Vérifier que l'adresse appartient à l'utilisateur
  const address = await db('user_addresses')
    .where({ id, user_id: req.user.id })
    .whereNull('deleted_at')
    .first();

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Adresse non trouvée'
    });
  }

  await db('user_addresses')
    .where({ id })
    .update({ deleted_at: db.fn.now() });

  res.json({
    success: true,
    message: 'Adresse supprimée avec succès'
  });
});

/**
 * Définir une adresse par défaut
 * PUT /api/users/addresses/:id/default
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  // Vérifier que l'adresse appartient à l'utilisateur
  const address = await db('user_addresses')
    .where({ id, user_id: req.user.id })
    .whereNull('deleted_at')
    .first();

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Adresse non trouvée'
    });
  }

  // Mettre toutes les adresses du même type à false
  const addressType = type || address.type;
  await db('user_addresses')
    .where({ user_id: req.user.id, type: addressType })
    .whereNull('deleted_at')
    .update({ is_default: false });

  // Mettre cette adresse à true
  const [updated] = await db('user_addresses')
    .where({ id })
    .update({ is_default: true })
    .returning('*');

  res.json({
    success: true,
    message: 'Adresse par défaut mise à jour',
    data: updated
  });
});

/**
 * Récupérer les notifications de l'utilisateur
 * GET /api/users/notifications
 */
const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

  // TODO: Implémenter le système de notifications
  // Pour l'instant, retourner des notifications simulées
  
  const mockNotifications = [
    {
      id: '1',
      type: 'order_update',
      title: 'Commande expédiée',
      message: 'Votre commande #AFM-2024-001234 a été expédiée',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // Il y a 2 heures
    },
    {
      id: '2', 
      type: 'promotion',
      title: 'Nouvelle promotion !',
      message: 'Découvrez -20% sur tous les boubous cette semaine',
      read: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Il y a 1 jour
    }
  ];

  const notifications = unreadOnly === 'true' 
    ? mockNotifications.filter(n => !n.read)
    : mockNotifications;

  res.json({
    success: true,
    data: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: notifications.length,
      pages: Math.ceil(notifications.length / limit)
    }
  });
});

/**
 * Marquer une notification comme lue
 * PUT /api/users/notifications/:id/read
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // TODO: Implémenter la mise à jour en base
  
  res.json({
    success: true,
    message: 'Notification marquée comme lue',
    data: { id }
  });
});

/**
 * Statistiques utilisateur pour le dashboard
 * GET /api/users/dashboard
 */
const getUserDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Commandes récentes
  const recentOrders = await db('orders')
    .select([
      'id', 'order_number', 'status', 'total_amount', 'currency', 'created_at'
    ])
    .where({ customer_id: userId })
    .orderBy('created_at', 'desc')
    .limit(5);

  // Statistiques
  const stats = await db('orders')
    .select([
      db.raw('COUNT(*) as total_orders'),
      db.raw('SUM(total_amount) as total_spent'),
      db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_orders'),
      db.raw('COUNT(CASE WHEN status = \'shipped\' THEN 1 END) as shipped_orders')
    ])
    .where({ customer_id: userId })
    .first();

  // Wishlist count
  const wishlistKey = CACHE_KEYS.USER_WISHLIST(userId);
  const wishlistCount = await sets.count(wishlistKey);

  res.json({
    success: true,
    data: {
      stats: {
        totalOrders: parseInt(stats.total_orders) || 0,
        totalSpent: parseFloat(stats.total_spent) || 0,
        pendingOrders: parseInt(stats.pending_orders) || 0,
        shippedOrders: parseInt(stats.shipped_orders) || 0,
        wishlistItems: wishlistCount
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        currency: order.currency,
        createdAt: order.created_at
      }))
    }
  });
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadAvatar,
  getUserWishlist,
  toggleWishlistItem,
  clearWishlist,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  getUserNotifications,
  markNotificationAsRead,
  getUserDashboard
};