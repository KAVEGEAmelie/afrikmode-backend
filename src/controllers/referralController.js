/**
 * Contrôleur de parrainage
 * Gère toutes les opérations liées au système de parrainage
 */

const ReferralService = require('../services/referralService');
const db = require('../config/database');

class ReferralController {

  /**
   * Créer/Obtenir le code de parrainage d'un utilisateur
   */
  static async getOrCreateReferralCode(req, res) {
    try {
      const userId = req.user.id;
      const tenantId = req.user.tenant_id || req.user.id;

      // Vérifier si l'utilisateur a déjà un code
      let userCode = await db('referral_codes')
        .where({ referrer_id: userId, is_active: true })
        .first();

      if (!userCode) {
        // Créer un nouveau code
        const result = await ReferralService.createReferralCode({
          userId,
          tenantId,
          maxUses: 50,
          referrerBonus: 500, // 500 points
          referredBonus: 200, // 200 points
          bonusType: 'points',
          minimumOrderAmount: 10000, // 10,000 FCFA minimum
          requiresFirstPurchase: true
        });

        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: result.message
          });
        }

        userCode = result.code;
      }

      // Générer les liens de partage
      const referralLink = ReferralService.generateReferralLink(userCode.code);
      const socialLinks = ReferralService.generateSocialShareLinks(
        userCode.code, 
        `${req.user.first_name} ${req.user.last_name}`
      );

      res.json({
        success: true,
        message: 'Code de parrainage récupéré avec succès',
        data: {
          code: userCode,
          referralLink,
          socialLinks
        }
      });

    } catch (error) {
      console.error('Erreur récupération code parrainage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Valider un code de parrainage
   */
  static async validateCode(req, res) {
    try {
      const { code } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const validation = await ReferralService.validateReferralCode(code, userId);

      res.json({
        success: validation.valid,
        message: validation.message,
        data: validation.valid ? {
          code: validation.referralCode.code,
          referrerBonus: validation.referralCode.referrer_bonus,
          referredBonus: validation.referralCode.referred_bonus,
          bonusType: validation.referralCode.bonus_type,
          minimumAmount: validation.referralCode.minimum_order_amount
        } : null
      });

    } catch (error) {
      console.error('Erreur validation code parrainage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Appliquer un code de parrainage lors de l'inscription
   */
  static async applyReferralCode(req, res) {
    try {
      const { code, source, campaign } = req.body;
      const userId = req.user.id;
      const tenantId = req.user.tenant_id || req.user.id;

      const result = await ReferralService.applyReferral({
        code,
        referredUserId: userId,
        tenantId,
        source: source || 'direct',
        campaign: campaign || null,
        trackingData: {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: new Date()
        }
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'Code de parrainage appliqué avec succès',
        data: {
          referral: result.referral,
          message: 'Vous recevrez vos points bonus après votre premier achat !'
        }
      });

    } catch (error) {
      console.error('Erreur application code parrainage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Obtenir les statistiques de parrainage d'un utilisateur
   */
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await ReferralService.getUserReferralStats(userId);

      res.json({
        success: true,
        message: 'Statistiques de parrainage récupérées',
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération stats parrainage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Obtenir l'historique des récompenses
   */
  static async getRewardsHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (page - 1) * limit;

      const [rewards, total] = await Promise.all([
        db('referral_rewards as rr')
          .leftJoin('referrals as r', 'rr.referral_id', 'r.id')
          .leftJoin('users as u', 'r.referred_id', 'u.id')
          .where('rr.user_id', userId)
          .select([
            'rr.*',
            'r.referred_at',
            'u.first_name as referred_first_name',
            'u.email as referred_email'
          ])
          .orderBy('rr.created_at', 'desc')
          .limit(limit)
          .offset(offset),

        db('referral_rewards')
          .where({ user_id: userId })
          .count('* as total')
          .first()
      ]);

      res.json({
        success: true,
        message: 'Historique des récompenses récupéré',
        data: {
          rewards,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total.total / limit),
            totalItems: parseInt(total.total),
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération historique récompenses:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Obtenir la liste des personnes parrainées
   */
  static async getReferredUsers(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (page - 1) * limit;

      const [referrals, total] = await Promise.all([
        db('referrals as r')
          .leftJoin('users as u', 'r.referred_id', 'u.id')
          .where('r.referrer_id', userId)
          .select([
            'r.id',
            'r.status',
            'r.referred_at',
            'r.first_purchase_at',
            'r.referrer_bonus_awarded',
            'r.referred_bonus_awarded',
            'r.bonus_type',
            'u.first_name',
            'u.last_name',
            'u.email'
          ])
          .orderBy('r.created_at', 'desc')
          .limit(limit)
          .offset(offset),

        db('referrals')
          .where({ referrer_id: userId })
          .count('* as total')
          .first()
      ]);

      res.json({
        success: true,
        message: 'Liste des parrainés récupérée',
        data: {
          referrals,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total.total / limit),
            totalItems: parseInt(total.total),
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération parrainés:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Dashboard des parrainages (statistiques complètes)
   */
  static async getDashboard(req, res) {
    try {
      const userId = req.user.id;

      // Statistiques générales
      const stats = await ReferralService.getUserReferralStats(userId);

      // Évolution mensuelle
      const monthlyStats = await db('referrals')
        .where('referrer_id', userId)
        .select(
          db.raw('DATE_TRUNC(\'month\', referred_at) as month'),
          db.raw('COUNT(*) as referrals'),
          db.raw('COUNT(CASE WHEN status = \'active\' THEN 1 END) as active_referrals'),
          db.raw('SUM(referrer_bonus_awarded) as total_bonus')
        )
        .groupBy(db.raw('DATE_TRUNC(\'month\', referred_at)'))
        .orderBy('month', 'desc')
        .limit(12);

      // Top 5 des meilleures performances
      const topPerformance = await db('referral_codes as rc')
        .leftJoin('referrals as r', 'rc.id', 'r.referral_code_id')
        .where('rc.referrer_id', userId)
        .select([
          'rc.code',
          'rc.created_at',
          db.raw('COUNT(r.id) as total_uses'),
          db.raw('SUM(r.referrer_bonus_awarded) as total_earned')
        ])
        .groupBy('rc.id', 'rc.code', 'rc.created_at')
        .orderBy('total_uses', 'desc')
        .limit(5);

      res.json({
        success: true,
        message: 'Dashboard de parrainage récupéré',
        data: {
          ...stats,
          monthlyStats,
          topPerformance
        }
      });

    } catch (error) {
      console.error('Erreur récupération dashboard parrainage:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Partager un code de parrainage par email
   */
  static async shareByEmail(req, res) {
    try {
      const userId = req.user.id;
      const { emails, message } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Liste d\'emails requise'
        });
      }

      // Récupérer le code de parrainage de l'utilisateur
      const userCode = await db('referral_codes')
        .where({ referrer_id: userId, is_active: true })
        .first();

      if (!userCode) {
        return res.status(400).json({
          success: false,
          message: 'Aucun code de parrainage actif'
        });
      }

      // Générer le lien de parrainage
      const referralLink = ReferralService.generateReferralLink(userCode.code);
      const referrerName = `${req.user.first_name} ${req.user.last_name}`;

      // TODO: Intégrer avec le service email pour envoyer les invitations
      // Pour l'instant, on simule l'envoi

      const emailData = {
        referrerName,
        referralLink,
        message: message || `${referrerName} vous invite à rejoindre AfrikMode !`,
        bonusAmount: userCode.referred_bonus,
        recipients: emails
      };

      // Log pour simulation
      console.log('📧 Invitation par email:', emailData);

      res.json({
        success: true,
        message: `Invitations envoyées à ${emails.length} destinataire(s)`,
        data: {
          referralLink,
          recipientsCount: emails.length
        }
      });

    } catch (error) {
      console.error('Erreur partage par email:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

}

module.exports = ReferralController;