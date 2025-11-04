/**
 * Routes de parrainage
 * Toutes les routes liées au système de parrainage
 */

const express = require('express');
const router = express.Router();
const ReferralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/auth');
const { param, body, query } = require('express-validator');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware.requireAuth);

/**
 * @route GET /api/referrals/code
 * @desc Obtenir ou créer le code de parrainage de l'utilisateur
 * @access Privé
 */
router.get('/code', ReferralController.getOrCreateReferralCode);

/**
 * @route GET /api/referrals/validate/:code
 * @desc Valider un code de parrainage
 * @access Privé
 */
router.get('/validate/:code', 
  param('code')
    .isLength({ min: 5, max: 20 })
    .withMessage('Le code de parrainage doit contenir entre 5 et 20 caractères')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Le code de parrainage ne peut contenir que des lettres majuscules et des chiffres'),
  ReferralController.validateCode
);

/**
 * @route POST /api/referrals/apply
 * @desc Appliquer un code de parrainage
 * @access Privé
 */
router.post('/apply',
  body('code')
    .isLength({ min: 5, max: 20 })
    .withMessage('Le code de parrainage doit contenir entre 5 et 20 caractères')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Le code de parrainage ne peut contenir que des lettres majuscules et des chiffres'),
  body('source')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La source ne peut pas dépasser 100 caractères'),
  body('campaign')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La campagne ne peut pas dépasser 100 caractères'),
  ReferralController.applyReferralCode
);

/**
 * @route GET /api/referrals/stats
 * @desc Obtenir les statistiques de parrainage
 * @access Privé
 */
router.get('/stats', ReferralController.getUserStats);

/**
 * @route GET /api/referrals/rewards
 * @desc Obtenir l'historique des récompenses
 * @access Privé
 */
router.get('/rewards', 
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre entier positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être un nombre entre 1 et 100'),
  ReferralController.getRewardsHistory
);

/**
 * @route GET /api/referrals/referred
 * @desc Obtenir la liste des personnes parrainées
 * @access Privé
 */
router.get('/referred',
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre entier positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être un nombre entre 1 et 100'),
  ReferralController.getReferredUsers
);

/**
 * @route GET /api/referrals/dashboard
 * @desc Obtenir le dashboard complet de parrainage
 * @access Privé
 */
router.get('/dashboard', ReferralController.getDashboard);

/**
 * @route POST /api/referrals/share/email
 * @desc Partager le code de parrainage par email
 * @access Privé
 */
router.post('/share/email',
  body('emails')
    .isArray({ min: 1, max: 20 })
    .withMessage('Vous devez fournir entre 1 et 20 emails')
    .custom((emails) => {
      for (let email of emails) {
        if (!email.includes('@')) {
          throw new Error('Format d\'email invalide');
        }
      }
      return true;
    }),
  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Le message ne peut pas dépasser 500 caractères'),
  ReferralController.shareByEmail
);

// Endpoints publics (sans authentification)

/**
 * @route GET /api/referrals/public/info/:code
 * @desc Obtenir les informations publiques d'un code de parrainage
 * @access Public
 */
router.get('/public/info/:code', 
  param('code')
    .isLength({ min: 5, max: 20 })
    .withMessage('Le code de parrainage doit contenir entre 5 et 20 caractères')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Le code de parrainage ne peut contenir que des lettres majuscules et des chiffres'),
  async (req, res) => {
    try {
      const { code } = req.params;
      
      const referralCode = await require('../config/database')('referral_codes as rc')
        .leftJoin('users as u', 'rc.referrer_id', 'u.id')
        .where({ 'rc.code': code, 'rc.is_active': true })
        .select([
          'rc.code',
          'rc.referred_bonus',
          'rc.bonus_type',
          'rc.minimum_order_amount',
          'u.first_name',
          'u.last_name',
          'u.avatar_url'
        ])
        .first();

      if (!referralCode) {
        return res.status(404).json({
          success: false,
          message: 'Code de parrainage non trouvé'
        });
      }

      // Vérifier l'expiration
      if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Code de parrainage expiré'
        });
      }

      res.json({
        success: true,
        message: 'Informations du code de parrainage',
        data: {
          code: referralCode.code,
          referrerName: `${referralCode.first_name} ${referralCode.last_name}`,
          referrerAvatar: referralCode.avatar_url,
          bonus: {
            amount: referralCode.referred_bonus,
            type: referralCode.bonus_type,
            minimumOrder: referralCode.minimum_order_amount
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération info code parrainage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
);

module.exports = router;