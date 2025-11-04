/**
 * Middleware de vérification de la double authentification (2FA)
 * Vérifie que l'utilisateur a complété la 2FA si elle est activée
 */

const TwoFactorAuthService = require('../services/twoFactorAuthService');

class TwoFactorMiddleware {

  /**
   * Middleware pour vérifier si l'utilisateur a besoin de 2FA
   * À utiliser après l'authentification normale mais avant l'accès aux ressources protégées
   */
  static requireTwoFactor() {
    return async (req, res, next) => {
      try {
        // Vérifier que l'utilisateur est déjà authentifié
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: req.__('auth.authentication_required'),
            code: 'AUTH_REQUIRED'
          });
        }

        const userId = req.user.id;
        
        // Vérifier si la 2FA est activée pour cet utilisateur
        const twoFactorEnabled = await TwoFactorAuthService.isEnabled(userId);
        
        if (!twoFactorEnabled) {
          // 2FA non activée, continuer normalement
          return next();
        }

        // Vérifier si l'utilisateur a déjà vérifié sa 2FA dans cette session
        if (req.session && req.session.twoFactorVerified) {
          return next();
        }

        // L'utilisateur doit compléter la 2FA
        return res.status(403).json({
          success: false,
          message: req.__('2fa.verification_required'),
          code: 'TWO_FACTOR_REQUIRED',
          data: {
            user_id: userId,
            requires_2fa: true,
            next_step: 'verify_2fa'
          }
        });

      } catch (error) {
        console.error('Erreur middleware 2FA:', error);
        return res.status(500).json({
          success: false,
          message: req.__('server.error'),
          code: 'SERVER_ERROR'
        });
      }
    };
  }

  /**
   * Middleware optionnel pour déclencher l'envoi automatique d'OTP
   * si l'utilisateur a la 2FA activée mais n'est pas encore vérifié
   */
  static autoSendOtp() {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.id) {
          return next();
        }

        const userId = req.user.id;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Vérifier si la 2FA est activée
        const twoFactorEnabled = await TwoFactorAuthService.isEnabled(userId);
        
        if (twoFactorEnabled && (!req.session || !req.session.twoFactorVerified)) {
          // Envoyer automatiquement le code OTP
          try {
            await TwoFactorAuthService.sendLoginOtp(userId, ipAddress, userAgent);
            
            // Ajouter une indication dans la réponse
            req.autoOtpSent = true;
          } catch (otpError) {
            console.error('Erreur envoi automatique OTP:', otpError);
          }
        }

        next();

      } catch (error) {
        console.error('Erreur middleware auto OTP:', error);
        next(); // Continuer même en cas d'erreur pour ne pas bloquer l'application
      }
    };
  }

  /**
   * Middleware pour marquer la session comme vérifiée après validation 2FA
   */
  static markAsVerified() {
    return (req, res, next) => {
      if (req.session) {
        req.session.twoFactorVerified = true;
        req.session.twoFactorVerifiedAt = new Date();
      }
      next();
    };
  }

  /**
   * Middleware pour nettoyer la vérification 2FA lors de la déconnexion
   */
  static clearVerification() {
    return (req, res, next) => {
      if (req.session) {
        req.session.twoFactorVerified = false;
        delete req.session.twoFactorVerifiedAt;
      }
      next();
    };
  }

  /**
   * Middleware pour vérifier que l'utilisateur N'A PAS la 2FA activée
   * Utile pour certaines routes qui ne sont disponibles que si 2FA est désactivée
   */
  static requireTwoFactorDisabled() {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: req.__('auth.authentication_required')
          });
        }

        const userId = req.user.id;
        const twoFactorEnabled = await TwoFactorAuthService.isEnabled(userId);
        
        if (twoFactorEnabled) {
          return res.status(403).json({
            success: false,
            message: req.__('2fa.must_disable_first'),
            code: 'TWO_FACTOR_ENABLED'
          });
        }

        next();

      } catch (error) {
        console.error('Erreur middleware 2FA désactivée:', error);
        return res.status(500).json({
          success: false,
          message: req.__('server.error')
        });
      }
    };
  }

  /**
   * Middleware pour les routes administratives sensibles
   * Exige toujours une vérification 2FA récente (moins de 30 minutes)
   */
  static requireRecentTwoFactorVerification(maxAgeMinutes = 30) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: req.__('auth.authentication_required')
          });
        }

        const userId = req.user.id;
        const twoFactorEnabled = await TwoFactorAuthService.isEnabled(userId);
        
        if (!twoFactorEnabled) {
          return res.status(403).json({
            success: false,
            message: req.__('2fa.required_for_admin_action'),
            code: 'TWO_FACTOR_REQUIRED_FOR_ADMIN'
          });
        }

        // Vérifier que la vérification est récente
        if (!req.session || !req.session.twoFactorVerified || !req.session.twoFactorVerifiedAt) {
          return res.status(403).json({
            success: false,
            message: req.__('2fa.verification_required'),
            code: 'TWO_FACTOR_REQUIRED'
          });
        }

        const verifiedAt = new Date(req.session.twoFactorVerifiedAt);
        const maxAge = maxAgeMinutes * 60 * 1000; // Convertir en milliscondes
        const isRecentVerification = (new Date() - verifiedAt) < maxAge;

        if (!isRecentVerification) {
          return res.status(403).json({
            success: false,
            message: req.__('2fa.verification_expired'),
            code: 'TWO_FACTOR_VERIFICATION_EXPIRED',
            data: {
              verified_at: verifiedAt,
              max_age_minutes: maxAgeMinutes
            }
          });
        }

        next();

      } catch (error) {
        console.error('Erreur middleware 2FA récente:', error);
        return res.status(500).json({
          success: false,
          message: req.__('server.error')
        });
      }
    };
  }

  /**
   * Middleware pour ajouter des informations 2FA à la réponse
   */
  static addTwoFactorInfo() {
    return async (req, res, next) => {
      try {
        if (req.user && req.user.id) {
          const twoFactorEnabled = await TwoFactorAuthService.isEnabled(req.user.id);
          const twoFactorVerified = req.session && req.session.twoFactorVerified;
          
          // Ajouter les informations à l'objet req pour utilisation dans les contrôleurs
          req.twoFactorInfo = {
            enabled: twoFactorEnabled,
            verified: twoFactorVerified,
            verified_at: req.session?.twoFactorVerifiedAt || null
          };
        }

        next();

      } catch (error) {
        console.error('Erreur middleware info 2FA:', error);
        next(); // Continuer même en cas d'erreur
      }
    };
  }

}

module.exports = TwoFactorMiddleware;