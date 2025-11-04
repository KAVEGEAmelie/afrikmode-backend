/**
 * Contrôleur pour la gestion des coupons de réduction
 * Gère la création, validation, application et suivi des coupons
 */

const Coupon = require('../models/Coupon');
const { validationResult } = require('express-validator');
const NotificationHelpers = require('../services/notificationHelpers');
const db = require('../config/database');

/**
 * Créer un nouveau coupon
 */
const createCoupon = async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Seuls les admins peuvent créer des coupons
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les administrateurs peuvent créer des coupons.'
      });
    }

    const couponData = {
      ...req.body,
      created_by: req.user.id,
      tenant_id: req.user.tenant_id || req.user.id
    };

    const coupon = await Coupon.create(couponData);

    // Envoyer une notification pour le nouveau coupon (si applicable)
    if (coupon.is_active && coupon.discount_type !== 'welcome_discount') {
      try {
        // Récupérer les utilisateurs éligibles (par exemple, les clients actifs)
        const eligibleUsers = await db('users')
          .where('tenant_id', req.user.tenant_id)
          .where('role', 'customer')
          .where('is_active', true)
          .pluck('id');

        if (eligibleUsers.length > 0) {
          await NotificationHelpers.sendNewCouponNotification(coupon, eligibleUsers, req.user.tenant_id);
          console.log(`🎉 Notification nouveau coupon envoyée à ${eligibleUsers.length} utilisateurs`);
        }
      } catch (notifError) {
        console.error('Erreur notification nouveau coupon:', notifError);
        // Ne pas faire échouer la création du coupon pour une erreur de notification
      }
    }

    res.status(201).json({
      success: true,
      message: 'Coupon créé avec succès',
      data: { coupon }
    });

  } catch (error) {
    console.error('Erreur création coupon:', error);
    
    if (error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        message: 'Ce code de coupon existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer tous les coupons avec pagination et filtres
 */
const getCoupons = async (req, res) => {
  try {
    // Seuls les admins peuvent voir tous les coupons
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const options = {
      tenantId: req.user.tenant_id || req.user.id,
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 20, 100),
      isActive: req.query.is_active ? req.query.is_active === 'true' : null,
      type: req.query.type || null,
      search: req.query.search || null
    };

    const result = await Coupon.findAll(options);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erreur récupération coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des coupons',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Récupérer un coupon par son ID
 */
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.id;

    const coupon = await Coupon.findById(id, tenantId);
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon introuvable'
      });
    }

    // Seuls les admins peuvent voir les détails complets
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    res.json({
      success: true,
      data: { coupon }
    });

  } catch (error) {
    console.error('Erreur récupération coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Valider un code de coupon (pour les clients)
 */
const validateCouponCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id || req.user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code de coupon requis'
      });
    }

    // Simuler des données de commande basiques pour la validation
    const orderData = {
      subtotal: parseFloat(req.body.subtotal) || 0,
      total: parseFloat(req.body.total) || 0,
      shipping_cost: parseFloat(req.body.shipping_cost) || 0,
      items: req.body.items || []
    };

    const validationResult = await Coupon.validateCoupon(code, userId, orderData, tenantId);

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.error,
        errorCode: validationResult.errorCode
      });
    }

    // Calculer la réduction
    const applicationResult = await Coupon.applyCoupon(
      validationResult.coupon, 
      orderData, 
      validationResult.applicableItems
    );

    res.json({
      success: true,
      message: 'Coupon valide',
      data: {
        coupon: {
          id: validationResult.coupon.id,
          code: validationResult.coupon.code,
          name: validationResult.coupon.name,
          description: validationResult.coupon.description,
          type: validationResult.coupon.type,
          value: validationResult.coupon.value
        },
        discount: applicationResult
      }
    });

  } catch (error) {
    console.error('Erreur validation coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la validation du coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Appliquer un coupon à une commande (méthode interne)
 */
const applyCouponToOrder = async (req, res) => {
  try {
    const { couponCode, orderData } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id || req.user.id;

    // Valider le coupon
    const validationResult = await Coupon.validateCoupon(couponCode, userId, orderData, tenantId);

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.error,
        errorCode: validationResult.errorCode
      });
    }

    // Appliquer le coupon
    const applicationResult = await Coupon.applyCoupon(
      validationResult.coupon,
      orderData,
      validationResult.applicableItems
    );

    res.json({
      success: true,
      message: 'Coupon appliqué avec succès',
      data: {
        coupon: validationResult.coupon,
        originalTotal: orderData.total,
        discount: applicationResult,
        newTotal: applicationResult.finalTotal
      }
    });

  } catch (error) {
    console.error('Erreur application coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'application du coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mettre à jour un coupon
 */
const updateCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    // Seuls les admins peuvent modifier des coupons
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.id;

    const updatedCoupon = await Coupon.update(id, req.body, tenantId);

    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Coupon mis à jour avec succès',
      data: { coupon: updatedCoupon }
    });

  } catch (error) {
    console.error('Erreur mise à jour coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Supprimer un coupon
 */
const deleteCoupon = async (req, res) => {
  try {
    // Seuls les admins peuvent supprimer des coupons
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.id;

    const deleted = await Coupon.delete(id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Coupon introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Coupon supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du coupon',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Activer/Désactiver un coupon
 */
const toggleCouponStatus = async (req, res) => {
  try {
    // Seuls les admins peuvent changer le statut
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const { id } = req.params;
    const { is_active } = req.body;
    const tenantId = req.user.tenant_id || req.user.id;

    const updatedCoupon = await Coupon.update(id, { is_active }, tenantId);

    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon introuvable'
      });
    }

    res.json({
      success: true,
      message: `Coupon ${is_active ? 'activé' : 'désactivé'} avec succès`,
      data: { coupon: updatedCoupon }
    });

  } catch (error) {
    console.error('Erreur changement statut coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtenir les statistiques d'utilisation d'un coupon
 */
const getCouponStats = async (req, res) => {
  try {
    // Seuls les admins peuvent voir les stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé'
      });
    }

    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.id;

    // Récupérer les statistiques d'utilisation
    const stats = await Coupon.getUsageStats(id, tenantId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Coupon introuvable'
      });
    }

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Erreur stats coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtenir l'historique d'utilisation des coupons par un utilisateur
 */
const getUserCouponHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id || req.user.id;

    const history = await Coupon.getUserUsageHistory(userId, tenantId);

    res.json({
      success: true,
      data: { history }
    });

  } catch (error) {
    console.error('Erreur historique coupon utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Fonction utilitaire pour notifier les coupons expirant bientôt
 * À appeler via un job cron quotidien
 */
const notifyExpiringCoupons = async () => {
  try {
    console.log('🔍 Recherche des coupons expirant bientôt...');
    
    // Récupérer les coupons expirant dans les 24 heures
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const expiringCoupons = await db('coupons')
      .join('coupon_usage', 'coupons.id', 'coupon_usage.coupon_id')
      .join('users', 'coupon_usage.user_id', 'users.id')
      .where('coupons.is_active', true)
      .where('coupons.valid_until', '<=', tomorrow)
      .where('coupons.valid_until', '>', new Date())
      .where('coupon_usage.used_at', null) // Coupons non utilisés
      .select(
        'coupons.*',
        'users.id as user_id',
        'users.first_name',
        'users.language',
        'users.tenant_id'
      );

    console.log(`📋 ${expiringCoupons.length} coupons expirant bientôt trouvés`);

    for (const coupon of expiringCoupons) {
      try {
        const userData = {
          id: coupon.user_id,
          first_name: coupon.first_name,
          language: coupon.language || 'fr',
          tenant_id: coupon.tenant_id
        };

        await NotificationHelpers.sendCouponExpiringNotification(coupon, userData);
        console.log(`⏰ Notification expiration envoyée pour coupon ${coupon.code}`);
        
        // Petit délai pour éviter de surcharger le service
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Erreur notification coupon ${coupon.code}:`, error);
      }
    }

    return { 
      success: true, 
      processed: expiringCoupons.length 
    };

  } catch (error) {
    console.error('Erreur notification coupons expirants:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  getCouponById,
  validateCouponCode,
  applyCouponToOrder,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponStats,
  getUserCouponHistory,
  notifyExpiringCoupons
};