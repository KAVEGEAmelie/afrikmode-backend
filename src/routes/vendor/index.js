const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const db = require('../../config/database');

// Import all vendor routes
const vendorDashboardRoutes = require('./vendorDashboard');
const vendorProductRoutes = require('./vendorProducts');
const vendorOrderRoutes = require('./vendorOrders');
const vendorFinanceRoutes = require('./vendorFinances');
const vendorAnalyticsRoutes = require('./vendorAnalytics');
const vendorMarketingRoutes = require('./vendorMarketing');
const vendorMessageRoutes = require('./vendorMessages');
const vendorReviewRoutes = require('./vendorReviews');
const vendorInventoryRoutes = require('./vendorInventory');
const vendorShippingRoutes = require('./vendorShipping');
const vendorLoyaltyRoutes = require('./vendorLoyalty');
const vendorEmailMarketingRoutes = require('./vendorEmailMarketing');
const vendorSettingsRoutes = require('./vendorSettings');

/**
 * VENDOR SPACE ROUTES
 * Base path: /api/vendor
 * 
 * All routes require authentication and vendor role
 */

/**
 * GET /api/vendor/eligibility
 * Vérifier l'éligibilité d'un utilisateur à devenir vendeur
 */
router.get('/eligibility', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les informations de l'utilisateur
    const user = await db('users')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'utilisateur a déjà une boutique
    const existingStore = await db('stores')
      .where({ owner_id: userId })
      .first();

    const eligibility = {
      eligible: true,
      reasons: [],
      user: {
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        role: user.role,
        status: user.status
      }
    };

    // Vérifications d'éligibilité
    if (!user.email_verified) {
      eligibility.eligible = false;
      eligibility.reasons.push('Email non vérifié');
    }

    if (user.status !== 'active') {
      eligibility.eligible = false;
      eligibility.reasons.push('Compte non actif');
    }

    if (user.role === 'admin') {
      eligibility.eligible = false;
      eligibility.reasons.push('Les administrateurs ne peuvent pas devenir vendeurs');
    }

    if (existingStore) {
      eligibility.eligible = false;
      eligibility.reasons.push('Vous avez déjà une boutique');
      eligibility.existing_store = {
        id: existingStore.id,
        name: existingStore.name,
        status: existingStore.status
      };
    }

    res.json({
      success: true,
      data: eligibility
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'éligibilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification d\'éligibilité'
    });
  }
});

// Dashboard & Statistics
router.use('/dashboard', vendorDashboardRoutes);

// Product Management
router.use('/products', vendorProductRoutes);

// Order Management
router.use('/orders', vendorOrderRoutes);

// Financial Management
router.use('/finances', vendorFinanceRoutes);

// Analytics & Reports
router.use('/analytics', vendorAnalyticsRoutes);

// Marketing & Promotions
router.use('/marketing', vendorMarketingRoutes);

// Customer Messages
router.use('/messages', vendorMessageRoutes);

// Reviews & Ratings
router.use('/reviews', vendorReviewRoutes);

// Inventory Management
router.use('/inventory', vendorInventoryRoutes);

// Shipping Configuration
router.use('/shipping', vendorShippingRoutes);

// Loyalty Program
router.use('/loyalty', vendorLoyaltyRoutes);

// Email Marketing
router.use('/email-marketing', vendorEmailMarketingRoutes);

// Vendor Settings
router.use('/settings', vendorSettingsRoutes);

module.exports = router;
