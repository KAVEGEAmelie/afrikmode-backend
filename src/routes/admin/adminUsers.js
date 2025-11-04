const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const db = require('../../config/database');
const { cache, CACHE_KEYS } = require('../../config/redis');
const { commonErrors } = require('../../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const emailService = require('../../services/email.service');

/**
 * @route GET /api/admin/users
 * @desc Récupérer tous les utilisateurs avec filtres
 * @access Private (Admin)
 */
router.get('/',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const {
      role,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = db('users')
      .select([
        'id',
        'name',
        'email',
        'phone',
        'role',
        'status',
        'avatar',
        'created_at',
        'updated_at',
        'last_login',
        'email_verified'
      ])
      .whereNull('deleted_at');

    // Filtre par rôle
    if (role && role !== 'all') {
      query = query.where('role', role);
    }

    // Filtre par statut
    if (status && status !== 'all') {
      query = query.where('status', status);
    }

    // Recherche
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function() {
        this.where('name', 'ilike', searchTerm)
          .orWhere('email', 'ilike', searchTerm)
          .orWhere('phone', 'ilike', searchTerm);
      });
    }

    // Tri
    const validSortFields = ['created_at', 'name', 'email', 'role', 'status', 'last_login'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    query = query.orderBy(sortField, order);

    // Pagination
    const offset = (page - 1) * limit;
    const total = await query.clone().count('id as count').first();
    const users = await query.limit(limit).offset(offset);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        totalPages: Math.ceil(total.count / limit)
      }
    });
  })
);

/**
 * @route GET /api/admin/users/stats
 * @desc Statistiques des utilisateurs
 * @access Private (Admin)
 */
router.get('/stats',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    // Vérifier le cache
    const cacheKey = `${CACHE_KEYS.USERS}:stats`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const stats = await db('users')
      .select([
        db.raw('COUNT(*) as total'),
        db.raw("COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers"),
        db.raw("COUNT(CASE WHEN role = 'vendor' THEN 1 END) as vendors"),
        db.raw("COUNT(CASE WHEN role IN ('admin', 'super_admin') THEN 1 END) as admins"),
        db.raw("COUNT(CASE WHEN status = 'active' THEN 1 END) as active"),
        db.raw("COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive"),
        db.raw("COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended")
      ])
      .whereNull('deleted_at')
      .first();

    const data = {
      total: parseInt(stats.total),
      customers: parseInt(stats.customers),
      vendors: parseInt(stats.vendors),
      admins: parseInt(stats.admins),
      active: parseInt(stats.active),
      inactive: parseInt(stats.inactive),
      suspended: parseInt(stats.suspended)
    };

    // Mettre en cache pour 5 minutes
    await cache.set(cacheKey, data, 300);

    res.json({
      success: true,
      data,
      cached: false
    });
  })
);

/**
 * @route GET /api/admin/users/:id
 * @desc Récupérer un utilisateur par ID
 * @access Private (Admin)
 */
router.get('/:id',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await db('users')
      .select([
        'id',
        'name',
        'email',
        'phone',
        'role',
        'status',
        'avatar',
        'address',
        'city',
        'country',
        'postal_code',
        'email_verified',
        'two_factor_enabled',
        'created_at',
        'updated_at',
        'last_login'
      ])
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      throw commonErrors.notFound('Utilisateur');
    }

    res.json({
      success: true,
      data: user
    });
  })
);

/**
 * @route POST /api/admin/users
 * @desc Créer un nouvel utilisateur
 * @access Private (Admin)
 */
router.post('/',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, status = 'active' } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      throw commonErrors.validation({
        name: !name ? 'Le nom est requis' : undefined,
        email: !email ? 'L\'email est requis' : undefined,
        password: !password ? 'Le mot de passe est requis' : undefined,
        role: !role ? 'Le rôle est requis' : undefined
      });
    }

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await db('users')
      .where({ email })
      .whereNull('deleted_at')
      .first();

    if (existingUser) {
      throw commonErrors.conflict('Cet email est déjà utilisé');
    }

    // Valider le rôle
    const validRoles = ['customer', 'vendor', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      throw commonErrors.validation({ role: 'Rôle invalide' });
    }

    // Seul super_admin peut créer d'autres super_admins
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      throw commonErrors.forbidden('Seul un super administrateur peut créer un autre super administrateur');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const [userId] = await db('users').insert({
      name,
      email,
      password: hashedPassword,
      role,
      status,
      email_verified: true, // Admin créé = vérifié par défaut
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    }).returning('id');

    // Récupérer l'utilisateur créé
    const newUser = await db('users')
      .select(['id', 'name', 'email', 'role', 'status', 'created_at'])
      .where({ id: userId })
      .first();

    // Envoyer un email de bienvenue
    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Bienvenue sur AfrikMode',
        template: 'user-created-by-admin',
        data: {
          name,
          email,
          temporaryPassword: password,
          loginUrl: `${process.env.FRONTEND_URL}/auth/login`,
          role: role === 'vendor' ? 'vendeur' : role === 'admin' ? 'administrateur' : 'client'
        }
      });
    } catch (emailError) {
      console.error('Erreur envoi email création user:', emailError);
    }

    // Invalider le cache
    await cache.delPattern(`${CACHE_KEYS.USERS}*`);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: newUser
    });
  })
);

/**
 * @route PUT /api/admin/users/:id
 * @desc Mettre à jour un utilisateur
 * @access Private (Admin)
 */
router.put('/:id',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, status, phone, address, city, country, postal_code } = req.body;

    // Vérifier que l'utilisateur existe
    const user = await db('users')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      throw commonErrors.notFound('Utilisateur');
    }

    // Vérifier les permissions pour modifier les rôles
    if (role) {
      // Ne peut pas modifier son propre rôle
      if (user.id === req.user.id) {
        throw commonErrors.forbidden('Vous ne pouvez pas modifier votre propre rôle');
      }

      // Seul super_admin peut créer/modifier des super_admins
      if ((role === 'super_admin' || user.role === 'super_admin') && req.user.role !== 'super_admin') {
        throw commonErrors.forbidden('Seul un super administrateur peut gérer les super administrateurs');
      }

      const validRoles = ['customer', 'vendor', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        throw commonErrors.validation({ role: 'Rôle invalide' });
      }
    }

    // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
    if (email && email !== user.email) {
      const existingUser = await db('users')
        .where({ email })
        .whereNull('deleted_at')
        .whereNot({ id })
        .first();

      if (existingUser) {
        throw commonErrors.conflict('Cet email est déjà utilisé');
      }
    }

    // Construire l'objet de mise à jour
    const updateData = {
      updated_at: db.fn.now()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (postal_code !== undefined) updateData.postal_code = postal_code;

    // Mettre à jour
    await db('users')
      .where({ id })
      .update(updateData);

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await db('users')
      .select(['id', 'name', 'email', 'role', 'status', 'phone', 'address', 'city', 'country', 'postal_code', 'updated_at'])
      .where({ id })
      .first();

    // Invalider le cache
    await cache.delPattern(`${CACHE_KEYS.USERS}*`);

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: updatedUser
    });
  })
);

/**
 * @route PATCH /api/admin/users/:id/status
 * @desc Changer le statut d'un utilisateur (activer/désactiver/suspendre)
 * @access Private (Admin)
 */
router.patch('/:id/status',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw commonErrors.validation({ status: 'Le statut est requis' });
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw commonErrors.validation({ status: 'Statut invalide. Valeurs autorisées: active, inactive, suspended' });
    }

    // Vérifier que l'utilisateur existe
    const user = await db('users')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      throw commonErrors.notFound('Utilisateur');
    }

    // Ne peut pas modifier son propre statut
    if (user.id === req.user.id) {
      throw commonErrors.forbidden('Vous ne pouvez pas modifier votre propre statut');
    }

    // Seul super_admin peut suspendre d'autres admins
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      throw commonErrors.forbidden('Seul un super administrateur peut modifier le statut d\'un autre super administrateur');
    }

    // Mettre à jour le statut
    await db('users')
      .where({ id })
      .update({
        status,
        updated_at: db.fn.now()
      });

    // Envoyer un email selon le statut
    try {
      if (status === 'suspended') {
        await emailService.sendEmail({
          to: user.email,
          subject: '⚠️ Votre compte a été suspendu',
          template: 'user-suspended',
          data: {
            name: user.name,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@afrikmode.com'
          }
        });
      } else if (status === 'active' && user.status === 'suspended') {
        await emailService.sendEmail({
          to: user.email,
          subject: '✅ Votre compte a été réactivé',
          template: 'user-reactivated',
          data: {
            name: user.name,
            loginUrl: `${process.env.FRONTEND_URL}/auth/login`
          }
        });
      }
    } catch (emailError) {
      console.error('Erreur envoi email changement statut:', emailError);
    }

    // Invalider le cache
    await cache.delPattern(`${CACHE_KEYS.USERS}*`);

    res.json({
      success: true,
      message: `Utilisateur ${status === 'active' ? 'activé' : status === 'suspended' ? 'suspendu' : 'désactivé'} avec succès`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        status
      }
    });
  })
);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Supprimer un utilisateur (soft delete)
 * @access Private (Admin)
 */
router.delete('/:id',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier que l'utilisateur existe
    const user = await db('users')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      throw commonErrors.notFound('Utilisateur');
    }

    // Ne peut pas se supprimer soi-même
    if (user.id === req.user.id) {
      throw commonErrors.forbidden('Vous ne pouvez pas supprimer votre propre compte');
    }

    // Seul super_admin peut supprimer d'autres super_admins
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      throw commonErrors.forbidden('Seul un super administrateur peut supprimer un autre super administrateur');
    }

    // Soft delete
    await db('users')
      .where({ id })
      .update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now()
      });

    // Envoyer un email de confirmation
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Suppression de votre compte',
        template: 'user-deleted',
        data: {
          name: user.name,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@afrikmode.com'
        }
      });
    } catch (emailError) {
      console.error('Erreur envoi email suppression:', emailError);
    }

    // Invalider le cache
    await cache.delPattern(`${CACHE_KEYS.USERS}*`);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  })
);

module.exports = router;
