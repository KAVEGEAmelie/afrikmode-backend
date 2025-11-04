/**
 * Routes pour la double authentification (2FA) par email
 */

const express = require('express');
const router = express.Router();
const TwoFactorController = require('../controllers/twoFactorController');
const { requireAuth: auth } = require('../middleware/auth');
const twoFactorMiddleware = require('../middleware/twoFactor');

// Routes publiques (pendant le processus de connexion)

/**
 * @route POST /api/2fa/verify
 * @desc Vérifier un code 2FA lors de la connexion
 * @access Public (avec user_id temporaire)
 */
router.post('/verify', TwoFactorController.verifyLogin);

// Routes protégées (utilisateur authentifié requis)

/**
 * @route GET /api/2fa/status
 * @desc Obtenir le statut 2FA de l'utilisateur connecté
 * @access Privé
 */
router.get('/status', 
  auth, 
  twoFactorMiddleware.addTwoFactorInfo(),
  TwoFactorController.getStatus
);

/**
 * @route POST /api/2fa/enable/initiate
 * @desc Initier l'activation de la 2FA
 * @access Privé
 */
router.post('/enable/initiate', 
  auth, 
  twoFactorMiddleware.requireTwoFactorDisabled(),
  TwoFactorController.initiateEnable
);

/**
 * @route POST /api/2fa/enable/confirm
 * @desc Confirmer l'activation de la 2FA avec le code OTP
 * @access Privé
 */
router.post('/enable/confirm', 
  auth, 
  TwoFactorController.confirmEnable
);

/**
 * @route POST /api/2fa/disable/initiate
 * @desc Initier la désactivation de la 2FA
 * @access Privé
 */
router.post('/disable/initiate', 
  auth, 
  twoFactorMiddleware.requireTwoFactor(),
  TwoFactorController.initiateDisable
);

/**
 * @route POST /api/2fa/disable/confirm
 * @desc Confirmer la désactivation de la 2FA avec le code OTP
 * @access Privé
 */
router.post('/disable/confirm', 
  auth, 
  TwoFactorController.confirmDisable
);

/**
 * @route POST /api/2fa/disable/backup
 * @desc Désactiver la 2FA avec le secret de sauvegarde
 * @access Privé
 */
router.post('/disable/backup', 
  auth, 
  TwoFactorController.disableWithBackup
);

/**
 * @route POST /api/2fa/resend-otp
 * @desc Renvoyer un code OTP
 * @access Privé
 */
router.post('/resend-otp', 
  auth, 
  TwoFactorController.resendOtp
);

/**
 * @route GET /api/2fa/statistics
 * @desc Obtenir les statistiques OTP de l'utilisateur
 * @access Privé
 */
router.get('/statistics', 
  auth, 
  twoFactorMiddleware.requireTwoFactor(),
  TwoFactorController.getStatistics
);

// Routes administratives

/**
 * @route GET /api/2fa/global-stats
 * @desc Obtenir les statistiques globales 2FA (admin uniquement)
 * @access Admin
 */
router.get('/global-stats', 
  auth, 
  twoFactorMiddleware.requireRecentTwoFactorVerification(15), // 15 minutes max
  TwoFactorController.getGlobalStatistics
);

module.exports = router;