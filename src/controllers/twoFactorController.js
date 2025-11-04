/**
 * Contrôleur pour la gestion de la double authentification (2FA)
 * Gestion de l'activation, désactivation et vérification 2FA par email
 */

const TwoFactorAuthService = require('../services/twoFactorAuthService');
const EmailOtpService = require('../services/emailOtpService');
const asyncHandler = require('express-async-handler');

class TwoFactorController {

  /**
   * @route GET /api/2fa/status
   * @desc Obtenir le statut 2FA de l'utilisateur connecté
   * @access Privé
   */
  static getStatus = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const status = await TwoFactorAuthService.getUserStatus(userId);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: req.__('user.not_found')
        });
      }

      res.json({
        success: true,
        message: req.__('2fa.status_retrieved'),
        data: {
          is_enabled: status.two_factor_enabled,
          account_created: status.account_created,
          last_updated: status.last_updated,
          statistics: status.otp_statistics,
          recent_activity: status.recent_activity
        }
      });

    } catch (error) {
      console.error('Erreur statut 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/enable/initiate
   * @desc Initier l'activation de la 2FA
   * @access Privé
   */
  static initiateEnable = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await TwoFactorAuthService.initiateEnable(userId, ipAddress, userAgent);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.enable_otp_sent'),
          data: {
            expires_at: result.expiresAt,
            step: 'verify_otp'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Erreur initiation activation 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/enable/confirm
   * @desc Confirmer l'activation de la 2FA avec le code OTP
   * @access Privé
   */
  static confirmEnable = asyncHandler(async (req, res) => {
    try {
      const { otp_code } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!otp_code) {
        return res.status(400).json({
          success: false,
          message: req.__('validation.otp_required')
        });
      }

      const result = await TwoFactorAuthService.confirmEnable(userId, otp_code, ipAddress);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.enabled_successfully'),
          data: {
            backup_secret: result.backup_secret,
            enabled_at: result.enabled_at,
            warning: req.__('2fa.backup_secret_warning')
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {
            remaining_attempts: result.remainingAttempts
          }
        });
      }

    } catch (error) {
      console.error('Erreur confirmation activation 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/disable/initiate
   * @desc Initier la désactivation de la 2FA
   * @access Privé
   */
  static initiateDisable = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await TwoFactorAuthService.initiateDisable(userId, ipAddress, userAgent);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.disable_otp_sent'),
          data: {
            expires_at: result.expiresAt,
            step: 'verify_otp'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Erreur initiation désactivation 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/disable/confirm
   * @desc Confirmer la désactivation de la 2FA avec le code OTP
   * @access Privé
   */
  static confirmDisable = asyncHandler(async (req, res) => {
    try {
      const { otp_code } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!otp_code) {
        return res.status(400).json({
          success: false,
          message: req.__('validation.otp_required')
        });
      }

      const result = await TwoFactorAuthService.confirmDisable(userId, otp_code, ipAddress);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.disabled_successfully'),
          data: {
            disabled_at: result.disabled_at
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {
            remaining_attempts: result.remainingAttempts
          }
        });
      }

    } catch (error) {
      console.error('Erreur confirmation désactivation 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/disable/backup
   * @desc Désactiver la 2FA avec le secret de sauvegarde
   * @access Privé
   */
  static disableWithBackup = asyncHandler(async (req, res) => {
    try {
      const { backup_secret } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!backup_secret) {
        return res.status(400).json({
          success: false,
          message: req.__('validation.backup_secret_required')
        });
      }

      const result = await TwoFactorAuthService.disableWithBackupSecret(userId, backup_secret, ipAddress);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.disabled_with_backup'),
          data: {
            disabled_at: result.disabled_at
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Erreur désactivation 2FA backup:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/verify
   * @desc Vérifier un code 2FA lors de la connexion
   * @access Public (session temporaire)
   */
  static verifyLogin = asyncHandler(async (req, res) => {
    try {
      const { user_id, otp_code } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!user_id || !otp_code) {
        return res.status(400).json({
          success: false,
          message: req.__('validation.required_fields')
        });
      }

      const result = await TwoFactorAuthService.verifyLoginOtp(user_id, otp_code, ipAddress);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.login_verified'),
          data: {
            verified_at: result.usedAt,
            otp_id: result.otpId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {
            remaining_attempts: result.remainingAttempts
          }
        });
      }

    } catch (error) {
      console.error('Erreur vérification 2FA login:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route POST /api/2fa/resend-otp
   * @desc Renvoyer un code OTP
   * @access Privé
   */
  static resendOtp = asyncHandler(async (req, res) => {
    try {
      const { type = 'login' } = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      if (!userId && type === 'login') {
        return res.status(400).json({
          success: false,
          message: req.__('validation.user_required')
        });
      }

      let result;

      switch (type) {
        case 'enable_2fa':
          result = await TwoFactorAuthService.initiateEnable(userId, ipAddress, userAgent);
          break;
        case 'disable_2fa':
          result = await TwoFactorAuthService.initiateDisable(userId, ipAddress, userAgent);
          break;
        case 'login':
          result = await TwoFactorAuthService.sendLoginOtp(userId, ipAddress, userAgent);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: req.__('validation.invalid_otp_type')
          });
      }

      if (result.success) {
        res.status(200).json({
          success: true,
          message: req.__('2fa.otp_resent'),
          data: {
            expires_at: result.expiresAt,
            type: type
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Erreur renvoi OTP:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route GET /api/2fa/statistics
   * @desc Obtenir les statistiques OTP de l'utilisateur
   * @access Privé
   */
  static getStatistics = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const stats = await EmailOtpService.getUserOtpStats(userId, parseInt(days));

      res.json({
        success: true,
        message: req.__('2fa.stats_retrieved'),
        data: {
          period_days: parseInt(days),
          statistics: stats
        }
      });

    } catch (error) {
      console.error('Erreur statistiques 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

  /**
   * @route GET /api/2fa/global-stats
   * @desc Obtenir les statistiques globales 2FA (admin uniquement)
   * @access Admin
   */
  static getGlobalStatistics = asyncHandler(async (req, res) => {
    try {
      // Vérifier si l'utilisateur est admin
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: req.__('auth.admin_required')
        });
      }

      const stats = await TwoFactorAuthService.getGlobalStats();

      res.json({
        success: true,
        message: req.__('2fa.global_stats_retrieved'),
        data: stats
      });

    } catch (error) {
      console.error('Erreur statistiques globales 2FA:', error);
      res.status(500).json({
        success: false,
        message: req.__('server.error')
      });
    }
  });

}

module.exports = TwoFactorController;