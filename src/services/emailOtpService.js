/**
 * Service de gestion des codes OTP par email
 */

const db = require('../config/database');
const crypto = require('crypto');

class EmailOtpService {

  /**
   * Créer un code OTP
   */
  static async createOtp(otpData) {
    try {
      const {
        userId,
        email,
        code,
        type = 'general',
        expiresAt,
        ipAddress,
        userAgent
      } = otpData;

      // Supprimer les anciens codes OTP pour cet utilisateur et ce type
      await db('email_otps')
        .where({
          user_id: userId,
          type: type,
          used: false
        })
        .update({ used: true });

      // Créer le nouveau code OTP
      const [otp] = await db('email_otps')
        .insert({
        user_id: userId,
          email: email,
        code: code,
        type: type,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
          attempts: 0,
          used: false
        })
        .returning('*');

      return otp;
    } catch (error) {
      console.error('Erreur création OTP:', error);
      throw error;
    }
  }

  /**
   * Vérifier un code OTP
   */
  static async verifyOtp(verificationData) {
    try {
      const {
        userId,
        email,
        code,
        type = 'general',
        ipAddress
      } = verificationData;

      // Trouver le code OTP valide
      const otp = await db('email_otps')
        .where({
          user_id: userId,
          email: email,
          code: code,
          type: type,
          used: false
        })
        .where('expires_at', '>', db.fn.now())
        .first();

      if (!otp) {
        // Incrémenter les tentatives échouées
        await this.incrementFailedAttempts(userId, email, type, ipAddress);

        return {
          success: false,
          message: 'Code OTP invalide ou expiré',
          remainingAttempts: await this.getRemainingAttempts(userId, email, type)
        };
      }

      // Vérifier le nombre de tentatives
      const attempts = await this.getFailedAttempts(userId, email, type);
      if (attempts >= 5) {
        return {
          success: false,
          message: 'Trop de tentatives échouées. Veuillez demander un nouveau code.',
          remainingAttempts: 0
        };
      }

      // Marquer le code comme utilisé
      await db('email_otps')
        .where({ id: otp.id })
        .update({
          used: true,
          used_at: db.fn.now(),
          used_ip_address: ipAddress
        });

      // Réinitialiser les tentatives échouées
      await this.resetFailedAttempts(userId, email, type);

      return {
        success: true,
        message: 'Code OTP vérifié avec succès'
      };
    } catch (error) {
      console.error('Erreur vérification OTP:', error);
      return {
        success: false,
        message: 'Erreur lors de la vérification du code'
      };
    }
  }

  /**
   * Incrémenter les tentatives échouées
   */
  static async incrementFailedAttempts(userId, email, type, ipAddress) {
    try {
      await db('email_otps')
      .where({
        user_id: userId,
          email: email,
        type: type,
          used: false
        })
        .where('expires_at', '>', db.fn.now())
        .increment('attempts', 1)
        .update({
          last_attempt_ip: ipAddress,
          last_attempt_at: db.fn.now()
        });
    } catch (error) {
      console.error('Erreur incrémentation tentatives:', error);
    }
  }

  /**
   * Obtenir le nombre de tentatives échouées
   */
  static async getFailedAttempts(userId, email, type) {
    try {
      const otp = await db('email_otps')
        .where({
          user_id: userId,
          email: email,
          type: type,
          used: false
        })
        .where('expires_at', '>', db.fn.now())
        .first();

      return otp ? otp.attempts : 0;
    } catch (error) {
      console.error('Erreur récupération tentatives:', error);
      return 0;
    }
  }

  /**
   * Obtenir le nombre de tentatives restantes
   */
  static async getRemainingAttempts(userId, email, type) {
    const attempts = await this.getFailedAttempts(userId, email, type);
    return Math.max(0, 5 - attempts);
  }

  /**
   * Réinitialiser les tentatives échouées
   */
  static async resetFailedAttempts(userId, email, type) {
    try {
      await db('email_otps')
      .where({
        user_id: userId,
          email: email,
          type: type
        })
        .update({
          attempts: 0,
          last_attempt_ip: null,
          last_attempt_at: null
        });
    } catch (error) {
      console.error('Erreur réinitialisation tentatives:', error);
    }
  }

  /**
   * Nettoyer les codes OTP expirés
   */
  static async cleanExpiredOtps() {
    try {
      const deleted = await db('email_otps')
        .where('expires_at', '<', db.fn.now())
        .del();

      console.log(`🧹 ${deleted} codes OTP expirés supprimés`);
      return deleted;
    } catch (error) {
      console.error('Erreur nettoyage OTP expirés:', error);
      return 0;
    }
  }

  /**
   * Obtenir les statistiques des codes OTP
   */
  static async getStats(userId = null) {
    try {
      let query = db('email_otps');

      if (userId) {
        query = query.where({ user_id: userId });
      }

      const stats = await query
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(*) FILTER (WHERE used = true) as used'),
          db.raw('COUNT(*) FILTER (WHERE used = false AND expires_at > NOW()) as active'),
          db.raw('COUNT(*) FILTER (WHERE used = false AND expires_at <= NOW()) as expired'),
          db.raw('COUNT(*) FILTER (WHERE attempts >= 5) as blocked')
        )
        .first();

      return {
        total: parseInt(stats.total) || 0,
        used: parseInt(stats.used) || 0,
        active: parseInt(stats.active) || 0,
        expired: parseInt(stats.expired) || 0,
        blocked: parseInt(stats.blocked) || 0
      };
    } catch (error) {
      console.error('Erreur récupération stats OTP:', error);
      return {
        total: 0,
        used: 0,
        active: 0,
        expired: 0,
        blocked: 0
      };
    }
  }

  /**
   * Générer un code OTP aléatoire
   */
  static generateOtpCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return code;
  }

  /**
   * Vérifier si un utilisateur peut recevoir un nouveau code OTP
   */
  static async canRequestNewOtp(userId, email, type) {
    try {
      // Vérifier s'il y a un code OTP actif récent (moins de 1 minute)
      const recentOtp = await db('email_otps')
        .where({
          user_id: userId,
          email: email,
          type: type,
          used: false
        })
        .where('expires_at', '>', db.fn.now())
        .where('created_at', '>', db.raw("NOW() - INTERVAL '1 minute'"))
        .first();

      if (recentOtp) {
        return {
          canRequest: false,
          message: 'Veuillez attendre avant de demander un nouveau code',
          waitTime: 60 // secondes
        };
      }

      // Vérifier le nombre de codes OTP demandés aujourd'hui
      const todayOtps = await db('email_otps')
        .where({
          user_id: userId,
          email: email,
          type: type
        })
        .where('created_at', '>=', db.raw("CURRENT_DATE"))
        .count('* as count')
        .first();

      const dailyLimit = 10;
      if (parseInt(todayOtps.count) >= dailyLimit) {
        return {
          canRequest: false,
          message: 'Limite quotidienne de codes OTP atteinte',
          waitTime: 24 * 60 * 60 // 24 heures en secondes
        };
      }

      return {
        canRequest: true,
        message: 'Code OTP peut être demandé'
      };
    } catch (error) {
      console.error('Erreur vérification possibilité OTP:', error);
      return {
        canRequest: false,
        message: 'Erreur lors de la vérification'
      };
    }
  }
}

module.exports = EmailOtpService;