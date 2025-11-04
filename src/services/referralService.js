/**
 * Service de parrainage
 * Gère la création, validation et récompenses du système de parrainage
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ReferralService {

  /**
   * Générer un code de parrainage unique
   */
  static generateReferralCode(userId, prefix = 'AFRIK') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const userFragment = userId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    
    return `${prefix}${userFragment}${timestamp}${random}`;
  }

  /**
   * Créer un code de parrainage pour un utilisateur
   */
  static async createReferralCode(referrerData) {
    try {
      const {
        userId,
        tenantId,
        maxUses = 50,
        referrerBonus = 500, // 500 points par défaut
        referredBonus = 200, // 200 points pour le parrainé
        bonusType = 'points',
        minimumOrderAmount = 0,
        requiresFirstPurchase = true,
        expiresAt = null,
        type = 'user'
      } = referrerData;

      // Vérifier si l'utilisateur a déjà un code actif
      const existingCode = await db('referral_codes')
        .where({ referrer_id: userId, is_active: true })
        .first();

      if (existingCode) {
        return {
          success: false,
          message: 'Un code de parrainage actif existe déjà',
          code: existingCode
        };
      }

      // Générer un code unique
      let code;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        code = this.generateReferralCode(userId);
        const existing = await db('referral_codes').where({ code }).first();
        attempts++;
        
        if (!existing) break;
        if (attempts >= maxAttempts) {
          throw new Error('Impossible de générer un code unique');
        }
      } while (attempts < maxAttempts);

      // Créer le code de parrainage
      const referralCode = {
        id: uuidv4(),
        referrer_id: userId,
        tenant_id: tenantId,
        code,
        type,
        max_uses: maxUses,
        current_uses: 0,
        expires_at: expiresAt,
        referrer_bonus: referrerBonus,
        referred_bonus: referredBonus,
        bonus_type: bonusType,
        minimum_order_amount: minimumOrderAmount,
        requires_first_purchase: requiresFirstPurchase,
        is_active: true,
        metadata: JSON.stringify({
          created_method: 'automatic',
          creation_source: 'user_request'
        })
      };

      const [newCode] = await db('referral_codes')
        .insert(referralCode)
        .returning('*');

      return {
        success: true,
        message: 'Code de parrainage créé avec succès',
        code: newCode
      };

    } catch (error) {
      throw new Error(`Erreur création code parrainage: ${error.message}`);
    }
  }

  /**
   * Valider un code de parrainage
   */
  static async validateReferralCode(code, referredUserId) {
    try {
      const referralCode = await db('referral_codes')
        .where({ code, is_active: true })
        .first();

      if (!referralCode) {
        return {
          valid: false,
          message: 'Code de parrainage invalide ou inactif'
        };
      }

      // Vérifier l'expiration
      if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
        await db('referral_codes')
          .where({ id: referralCode.id })
          .update({ is_active: false });
          
        return {
          valid: false,
          message: 'Code de parrainage expiré'
        };
      }

      // Vérifier le nombre d'utilisations
      if (referralCode.current_uses >= referralCode.max_uses) {
        return {
          valid: false,
          message: 'Code de parrainage épuisé'
        };
      }

      // Vérifier que l'utilisateur ne se parraine pas lui-même
      if (referralCode.referrer_id === referredUserId) {
        return {
          valid: false,
          message: 'Vous ne pouvez pas utiliser votre propre code'
        };
      }

      // Vérifier si l'utilisateur n'a pas déjà été parrainé
      const existingReferral = await db('referrals')
        .where({ referred_id: referredUserId })
        .first();

      if (existingReferral) {
        return {
          valid: false,
          message: 'Vous avez déjà été parrainé'
        };
      }

      return {
        valid: true,
        message: 'Code de parrainage valide',
        referralCode
      };

    } catch (error) {
      throw new Error(`Erreur validation code parrainage: ${error.message}`);
    }
  }

  /**
   * Appliquer un parrainage
   */
  static async applyReferral(referralData) {
    const trx = await db.transaction();
    
    try {
      const {
        code,
        referredUserId,
        tenantId,
        source = 'direct',
        campaign = null,
        trackingData = {}
      } = referralData;

      // Valider le code
      const validation = await this.validateReferralCode(code, referredUserId);
      if (!validation.valid) {
        await trx.rollback();
        return validation;
      }

      const referralCode = validation.referralCode;

      // Créer l'enregistrement de parrainage
      const referral = {
        id: uuidv4(),
        referral_code_id: referralCode.id,
        referrer_id: referralCode.referrer_id,
        referred_id: referredUserId,
        tenant_id: tenantId,
        status: 'pending',
        referred_at: new Date(),
        registered_at: new Date(),
        source,
        campaign,
        tracking_data: JSON.stringify(trackingData)
      };

      const [newReferral] = await trx('referrals')
        .insert(referral)
        .returning('*');

      // Mettre à jour le compteur d'utilisations
      await trx('referral_codes')
        .where({ id: referralCode.id })
        .increment('current_uses', 1);

      await trx.commit();

      return {
        success: true,
        message: 'Parrainage appliqué avec succès',
        referral: newReferral
      };

    } catch (error) {
      await trx.rollback();
      throw new Error(`Erreur application parrainage: ${error.message}`);
    }
  }

  /**
   * Activer les récompenses de parrainage (après premier achat)
   */
  static async activateReferralRewards(orderId, userId, orderAmount) {
    const trx = await db.transaction();
    
    try {
      // Trouver le parrainage en attente
      const referral = await trx('referrals')
        .where({ 
          referred_id: userId, 
          status: 'pending' 
        })
        .first();

      if (!referral) {
        await trx.rollback();
        return { success: false, message: 'Aucun parrainage en attente' };
      }

      // Récupérer les détails du code de parrainage
      const referralCode = await trx('referral_codes')
        .where({ id: referral.referral_code_id })
        .first();

      // Vérifier le montant minimum
      if (orderAmount < referralCode.minimum_order_amount) {
        await trx.rollback();
        return {
          success: false,
          message: `Montant minimum requis: ${referralCode.minimum_order_amount} FCFA`
        };
      }

      // Mettre à jour le parrainage
      await trx('referrals')
        .where({ id: referral.id })
        .update({
          status: 'active',
          first_purchase_at: new Date(),
          triggering_order_id: orderId,
          triggering_order_amount: orderAmount,
          bonus_awarded_at: new Date(),
          referrer_bonus_awarded: referralCode.referrer_bonus,
          referred_bonus_awarded: referralCode.referred_bonus,
          bonus_type: referralCode.bonus_type
        });

      // Créer les récompenses
      const rewards = [];

      // Récompense pour le parrain
      if (referralCode.referrer_bonus > 0) {
        const referrerReward = {
          id: uuidv4(),
          referral_id: referral.id,
          user_id: referral.referrer_id,
          tenant_id: referral.tenant_id,
          reward_type: referralCode.bonus_type,
          amount: referralCode.referrer_bonus,
          currency: 'FCFA',
          status: 'awarded',
          awarded_at: new Date(),
          metadata: JSON.stringify({ role: 'referrer', order_id: orderId })
        };
        
        await trx('referral_rewards').insert(referrerReward);
        rewards.push(referrerReward);
      }

      // Récompense pour le parrainé
      if (referralCode.referred_bonus > 0) {
        const referredReward = {
          id: uuidv4(),
          referral_id: referral.id,
          user_id: referral.referred_id,
          tenant_id: referral.tenant_id,
          reward_type: referralCode.bonus_type,
          amount: referralCode.referred_bonus,
          currency: 'FCFA',
          status: 'awarded',
          awarded_at: new Date(),
          metadata: JSON.stringify({ role: 'referred', order_id: orderId })
        };
        
        await trx('referral_rewards').insert(referredReward);
        rewards.push(referredReward);
      }

      // Mettre à jour les points de fidélité si bonus en points
      if (referralCode.bonus_type === 'points') {
        await trx('users')
          .where({ id: referral.referrer_id })
          .increment('loyalty_points', referralCode.referrer_bonus);

        await trx('users')
          .where({ id: referral.referred_id })
          .increment('loyalty_points', referralCode.referred_bonus);
      }

      await trx.commit();

      return {
        success: true,
        message: 'Récompenses de parrainage activées',
        referral,
        rewards
      };

    } catch (error) {
      await trx.rollback();
      throw new Error(`Erreur activation récompenses: ${error.message}`);
    }
  }

  /**
   * Obtenir les statistiques de parrainage d'un utilisateur
   */
  static async getUserReferralStats(userId) {
    try {
      // Code de parrainage de l'utilisateur
      const userCode = await db('referral_codes')
        .where({ referrer_id: userId, is_active: true })
        .first();

      // Parrainages réalisés
      const referrals = await db('referrals')
        .where({ referrer_id: userId })
        .count('* as total')
        .first();

      // Parrainages actifs (avec achat)
      const activeReferrals = await db('referrals')
        .where({ referrer_id: userId, status: 'active' })
        .count('* as active')
        .first();

      // Total des récompenses gagnées
      const totalRewards = await db('referral_rewards')
        .where({ user_id: userId })
        .sum('amount as total')
        .first();

      // Derniers parrainages
      const recentReferrals = await db('referrals as r')
        .leftJoin('users as u', 'r.referred_id', 'u.id')
        .where('r.referrer_id', userId)
        .select([
          'r.*',
          'u.first_name as referred_first_name',
          'u.email as referred_email'
        ])
        .orderBy('r.created_at', 'desc')
        .limit(10);

      return {
        userCode,
        stats: {
          totalReferrals: parseInt(referrals.total) || 0,
          activeReferrals: parseInt(activeReferrals.active) || 0,
          totalRewards: parseFloat(totalRewards.total) || 0,
          conversionRate: referrals.total > 0 
            ? ((activeReferrals.active / referrals.total) * 100).toFixed(1)
            : 0
        },
        recentReferrals
      };

    } catch (error) {
      throw new Error(`Erreur récupération stats parrainage: ${error.message}`);
    }
  }

  /**
   * Générer un lien de parrainage
   */
  static generateReferralLink(code, baseUrl = 'https://afrikmode.com') {
    return `${baseUrl}/register?ref=${code}`;
  }

  /**
   * Générer un lien de partage social
   */
  static generateSocialShareLinks(code, referrerName) {
    const referralLink = this.generateReferralLink(code);
    const message = `Rejoignez ${referrerName} sur AfrikMode et économisez sur votre première commande ! ${referralLink}`;
    
    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      email: `mailto:?subject=Découvrez AfrikMode&body=${encodeURIComponent(message)}`
    };
  }

}

module.exports = ReferralService;