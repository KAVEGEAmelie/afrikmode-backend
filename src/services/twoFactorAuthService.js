/**
 * Service d'authentification à deux facteurs (2FA)
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../config/database');
const emailService = require('./emailService');
const emailOtpService = require('./emailOtpService');

class TwoFactorAuthService {

  /**
   * Générer un secret 2FA pour un utilisateur
   */
  static async generateSecret(userId) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${process.env.TWO_FA_ISSUER || 'AfrikMode'} (${userId})`,
        issuer: process.env.TWO_FA_ISSUER || 'AfrikMode',
        length: 32
      });

      // Sauvegarder le secret en base
      await db('users')
        .where({ id: userId })
        .update({
          two_factor_secret: secret.base32,
          two_factor_enabled: false
        });

      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url
      };
    } catch (error) {
      console.error('Erreur génération secret 2FA:', error);
      throw new Error('Erreur lors de la génération du secret 2FA');
    }
  }

  /**
   * Générer un QR code pour l'authentification 2FA
   */
  static async generateQRCode(secret) {
    try {
      const qrCodeUrl = await QRCode.toDataURL(secret);
      return qrCodeUrl;
    } catch (error) {
      console.error('Erreur génération QR code:', error);
      throw new Error('Erreur lors de la génération du QR code');
    }
  }

  /**
   * Vérifier un code 2FA
   */
  static async verifyToken(userId, token) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user || !user.two_factor_secret) {
        throw new Error('Secret 2FA non trouvé');
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2 // Tolérance de 2 périodes (60 secondes)
      });

      return verified;
    } catch (error) {
      console.error('Erreur vérification token 2FA:', error);
      return false;
    }
  }

  /**
   * Activer la 2FA pour un utilisateur
   */
  static async enable2FA(userId, token) {
    try {
      const isValid = await this.verifyToken(userId, token);
      
      if (!isValid) {
        throw new Error('Code de vérification invalide');
      }

      await db('users')
        .where({ id: userId })
        .update({
          two_factor_enabled: true,
          two_factor_verified_at: db.fn.now()
        });

      return true;
    } catch (error) {
      console.error('Erreur activation 2FA:', error);
      throw error;
    }
  }

  /**
   * Désactiver la 2FA pour un utilisateur
   */
  static async disable2FA(userId, token) {
    try {
      const isValid = await this.verifyToken(userId, token);
      
      if (!isValid) {
        throw new Error('Code de vérification invalide');
      }

      await db('users')
        .where({ id: userId })
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_verified_at: null
        });

      return true;
    } catch (error) {
      console.error('Erreur désactivation 2FA:', error);
      throw error;
    }
  }

  /**
   * Vérifier si la 2FA est activée pour un utilisateur
   */
  static async isEnabled(userId) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      return user && user.two_factor_enabled;
    } catch (error) {
      console.error('Erreur vérification statut 2FA:', error);
      return false;
    }
  }

  /**
   * Envoyer un code OTP par email pour la connexion
   */
  static async sendLoginOtp(userId, ipAddress, userAgent) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Générer un code OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Sauvegarder le code OTP
      await emailOtpService.createOtp({
        userId: userId,
        email: user.email,
        code: otpCode,
        type: 'login',
        expiresAt: expiresAt,
        ipAddress: ipAddress,
        userAgent: userAgent
      });

      // Envoyer l'email
      await emailService.sendLoginOtpEmail(user.email, user.first_name, otpCode);

      return true;
    } catch (error) {
      console.error('Erreur envoi OTP login:', error);
      throw error;
    }
  }

  /**
   * Vérifier un code OTP de connexion
   */
  static async verifyLoginOtp(userId, otpCode, ipAddress) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user) {
        return {
          success: false,
          message: 'Utilisateur non trouvé'
        };
      }

      // Vérifier le code OTP
      const otpValidation = await emailOtpService.verifyOtp({
        userId: userId,
        email: user.email,
        code: otpCode,
        type: 'login',
        ipAddress: ipAddress
      });

      if (!otpValidation.success) {
        return {
          success: false,
          message: otpValidation.message,
          remainingAttempts: otpValidation.remainingAttempts
        };
      }

      return {
        success: true,
        message: 'Code OTP vérifié avec succès'
      };
    } catch (error) {
      console.error('Erreur vérification OTP login:', error);
      return {
        success: false,
        message: 'Erreur lors de la vérification du code'
      };
    }
  }

  /**
   * Générer des codes de récupération
   */
  static async generateRecoveryCodes(userId) {
    try {
      const codes = [];
      for (let i = 0; i < 10; i++) {
        codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
      }

      // Sauvegarder les codes (hashés) en base
      const hashedCodes = codes.map(code => require('crypto').createHash('sha256').update(code).digest('hex'));
      
      await db('users')
        .where({ id: userId })
        .update({
          two_factor_recovery_codes: JSON.stringify(hashedCodes)
        });

      return codes;
    } catch (error) {
      console.error('Erreur génération codes de récupération:', error);
      throw error;
    }
  }

  /**
   * Vérifier un code de récupération
   */
  static async verifyRecoveryCode(userId, recoveryCode) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user || !user.two_factor_recovery_codes) {
        return false;
      }

      const savedCodes = JSON.parse(user.two_factor_recovery_codes);
      const hashedCode = require('crypto').createHash('sha256').update(recoveryCode).digest('hex');

      const codeIndex = savedCodes.indexOf(hashedCode);
      if (codeIndex === -1) {
        return false;
      }

      // Supprimer le code utilisé
      savedCodes.splice(codeIndex, 1);
      await db('users')
        .where({ id: userId })
        .update({
          two_factor_recovery_codes: JSON.stringify(savedCodes)
        });

      return true;
    } catch (error) {
      console.error('Erreur vérification code de récupération:', error);
      return false;
    }
  }

  /**
   * Obtenir le statut 2FA d'un utilisateur
   */
  static async getStatus(userId) {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user) {
        return null;
      }

      return {
        enabled: user.two_factor_enabled,
        hasSecret: !!user.two_factor_secret,
        verifiedAt: user.two_factor_verified_at,
        hasRecoveryCodes: !!user.two_factor_recovery_codes
      };
    } catch (error) {
      console.error('Erreur récupération statut 2FA:', error);
      return null;
    }
  }
}

module.exports = TwoFactorAuthService;