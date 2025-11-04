const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');
const { cache, CACHE_KEYS } = require('../config/redis');
const { commonErrors } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

/**
 * @route GET /api/admin/stores/requests
 * @desc Récupérer toutes les demandes de boutiques
 * @access Private (Admin)
 */
router.get('/requests',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const {
      status,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search
    } = req.query;

    let query = db('stores')
      .leftJoin('users', 'stores.owner_id', 'users.id')
      .select([
        'stores.*',
        'users.name as vendor_name',
        'users.email as vendor_email',
        'users.phone as vendor_phone'
      ])
      .whereNull('stores.deleted_at');

    // Filtre par statut
    if (status && status !== 'all') {
      query = query.where('stores.status', status);
    }

    // Recherche
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(function() {
        this.where('stores.name', 'ilike', searchTerm)
          .orWhere('stores.email', 'ilike', searchTerm)
          .orWhere('users.name', 'ilike', searchTerm)
          .orWhere('users.email', 'ilike', searchTerm);
      });
    }

    // Tri
    const validSortFields = ['created_at', 'name', 'status'];
    const sortField = validSortFields.includes(sortBy) ? `stores.${sortBy}` : 'stores.created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    query = query.orderBy(sortField, order);

    // Pagination
    const offset = (page - 1) * limit;
    const total = await query.clone().count('stores.id as count').first();
    const stores = await query.limit(limit).offset(offset);

    res.json({
      success: true,
      data: stores.map(store => ({
        id: store.id,
        vendor_name: store.vendor_name,
        email: store.vendor_email || store.email,
        phone: store.vendor_phone || store.phone,
        business_name: store.name,
        business_type: store.business_type,
        tax_id: store.tax_id,
        address: store.address,
        city: store.city,
        country: store.country,
        website: store.website,
        description: store.description,
        documents: {
          business_registration: store.business_registration_doc,
          tax_certificate: store.tax_certificate_doc,
          id_card: store.id_card_doc,
          product_samples: store.product_samples ? JSON.parse(store.product_samples) : []
        },
        status: store.status,
        submitted_at: store.created_at,
        reviewed_at: store.reviewed_at,
        reviewed_by: store.reviewed_by,
        rejection_reason: store.rejection_reason,
        notes: store.admin_notes
      })),
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
 * @route PATCH /api/admin/stores/:id/approve
 * @desc Approuver une demande de boutique
 * @access Private (Admin)
 */
router.patch('/:id/approve',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    // Récupérer la boutique
    const store = await db('stores')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!store) {
      throw commonErrors.notFound('Boutique');
    }

    if (store.status === 'approved') {
      throw commonErrors.conflict('Cette boutique est déjà approuvée');
    }

    // Mettre à jour le statut
    await db('stores')
      .where({ id })
      .update({
        status: 'active',
        is_verified: true,
        reviewed_at: db.fn.now(),
        reviewed_by: req.user.id,
        admin_notes: notes,
        updated_at: db.fn.now()
      });

    // Récupérer l'owner pour l'email
    const owner = await db('users').where({ id: store.owner_id }).first();

    // Envoyer l'email de confirmation
    if (owner && owner.email) {
      try {
        await emailService.sendEmail({
          to: owner.email,
          subject: '✅ Votre boutique a été approuvée !',
          template: 'vendor-approved',
          data: {
            vendorName: owner.name,
            storeName: store.name,
            dashboardUrl: `${process.env.FRONTEND_URL}/vendor/dashboard`,
            loginUrl: `${process.env.FRONTEND_URL}/auth/login`
          }
        });
      } catch (emailError) {
        console.error('Erreur envoi email approbation:', emailError);
      }
    }

    // Invalider les caches
    await cache.delPattern(`${CACHE_KEYS.STORES}*`);

    res.json({
      success: true,
      message: 'Boutique approuvée avec succès',
      data: {
        id: store.id,
        name: store.name,
        status: 'active'
      }
    });
  })
);

/**
 * @route PATCH /api/admin/stores/:id/reject
 * @desc Rejeter une demande de boutique
 * @access Private (Admin)
 */
router.patch('/:id/reject',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      throw commonErrors.validation({ reason: 'La raison du rejet est requise' });
    }

    // Récupérer la boutique
    const store = await db('stores')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!store) {
      throw commonErrors.notFound('Boutique');
    }

    if (store.status === 'rejected') {
      throw commonErrors.conflict('Cette boutique est déjà rejetée');
    }

    // Mettre à jour le statut
    await db('stores')
      .where({ id })
      .update({
        status: 'rejected',
        is_verified: false,
        reviewed_at: db.fn.now(),
        reviewed_by: req.user.id,
        rejection_reason: reason,
        admin_notes: notes,
        updated_at: db.fn.now()
      });

    // Récupérer l'owner pour l'email
    const owner = await db('users').where({ id: store.owner_id }).first();

    // Envoyer l'email de rejet
    if (owner && owner.email) {
      try {
        await emailService.sendEmail({
          to: owner.email,
          subject: '❌ Demande de boutique refusée',
          template: 'vendor-rejected',
          data: {
            vendorName: owner.name,
            storeName: store.name,
            rejectionReason: reason,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@afrikmode.com'
          }
        });
      } catch (emailError) {
        console.error('Erreur envoi email rejet:', emailError);
      }
    }

    // Invalider les caches
    await cache.delPattern(`${CACHE_KEYS.STORES}*`);

    res.json({
      success: true,
      message: 'Boutique rejetée',
      data: {
        id: store.id,
        name: store.name,
        status: 'rejected',
        rejectionReason: reason
      }
    });
  })
);

/**
 * @route PATCH /api/admin/stores/:id/request-info
 * @desc Demander des informations complémentaires
 * @access Private (Admin)
 */
router.patch('/:id/request-info',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { message, notes } = req.body;

    if (!message) {
      throw commonErrors.validation({ message: 'Le message est requis' });
    }

    // Récupérer la boutique
    const store = await db('stores')
      .where({ id })
      .whereNull('deleted_at')
      .first();

    if (!store) {
      throw commonErrors.notFound('Boutique');
    }

    if (store.status === 'approved' || store.status === 'rejected') {
      throw commonErrors.conflict('Impossible de demander des informations pour cette boutique');
    }

    // Mettre à jour le statut
    await db('stores')
      .where({ id })
      .update({
        status: 'additional_info_required',
        reviewed_at: db.fn.now(),
        reviewed_by: req.user.id,
        admin_notes: notes || message,
        updated_at: db.fn.now()
      });

    // Créer un message dans une table de communications (si elle existe)
    try {
      await db('store_admin_messages').insert({
        store_id: id,
        admin_id: req.user.id,
        message: message,
        message_type: 'info_request',
        created_at: db.fn.now()
      });
    } catch (err) {
      // Table n'existe peut-être pas encore, on continue
      console.log('Table store_admin_messages non disponible');
    }

    // Récupérer l'owner pour l'email
    const owner = await db('users').where({ id: store.owner_id }).first();

    // Envoyer l'email
    if (owner && owner.email) {
      try {
        await emailService.sendEmail({
          to: owner.email,
          subject: '📋 Informations complémentaires requises',
          template: 'vendor-info-request',
          data: {
            vendorName: owner.name,
            storeName: store.name,
            requestedInfo: message,
            dashboardUrl: `${process.env.FRONTEND_URL}/vendor/application-status`
          }
        });
      } catch (emailError) {
        console.error('Erreur envoi email info request:', emailError);
      }
    }

    // Invalider les caches
    await cache.delPattern(`${CACHE_KEYS.STORES}*`);

    res.json({
      success: true,
      message: 'Demande d\'informations envoyée',
      data: {
        id: store.id,
        name: store.name,
        status: 'additional_info_required'
      }
    });
  })
);

/**
 * @route PATCH /api/admin/stores/:id/notes
 * @desc Mettre à jour les notes admin d'une boutique
 * @access Private (Admin)
 */
router.patch('/:id/notes',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    await db('stores')
      .where({ id })
      .update({
        admin_notes: notes,
        updated_at: db.fn.now()
      });

    res.json({
      success: true,
      message: 'Notes mises à jour'
    });
  })
);

/**
 * @route GET /api/admin/stores/stats
 * @desc Statistiques des demandes de boutiques
 * @access Private (Admin)
 */
router.get('/stats',
  requireAuth,
  requireRole(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const stats = await db('stores')
      .select([
        db.raw('COUNT(*) as total'),
        db.raw("COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending"),
        db.raw("COUNT(CASE WHEN status = 'additional_info_required' THEN 1 END) as info_required"),
        db.raw("COUNT(CASE WHEN status = 'active' THEN 1 END) as active"),
        db.raw("COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected")
      ])
      .whereNull('deleted_at')
      .first();

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        pending: parseInt(stats.pending),
        infoRequired: parseInt(stats.info_required),
        active: parseInt(stats.active),
        rejected: parseInt(stats.rejected)
      }
    });
  })
);

module.exports = router;
