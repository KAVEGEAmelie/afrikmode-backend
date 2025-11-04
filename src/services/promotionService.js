/**
 * Service de gestion des promotions et coupons
 * Centralise la logique de calcul, validation et application des promotions
 */

const Coupon = require('../models/Coupon');
const db = require('../config/database');

class PromotionService {

  /**
   * Valider et appliquer un coupon à une commande
   */
  static async applyPromotion(couponCode, orderData, userId, tenantId) {
    try {
      if (!couponCode) {
        return {
          success: true,
          discountAmount: 0,
          appliedCoupon: null,
          freeShipping: false
        };
      }

      // Valider le coupon
      const validationResult = await Coupon.validateCoupon(
        couponCode, 
        userId, 
        orderData, 
        tenantId
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: validationResult.errorCode
        };
      }

      // Appliquer le coupon
      const applicationResult = await Coupon.applyCoupon(
        validationResult.coupon,
        orderData,
        validationResult.applicableItems
      );

      return {
        success: true,
        discountAmount: applicationResult.discountAmount,
        appliedCoupon: validationResult.coupon,
        freeShipping: applicationResult.freeShipping,
        freeItems: applicationResult.freeItems,
        finalTotal: applicationResult.finalTotal
      };

    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de l\'application de la promotion',
        details: error.message
      };
    }
  }

  /**
   * Calculer les meilleurs coupons disponibles pour un utilisateur
   */
  static async getBestCouponsForUser(userId, orderData, tenantId, limit = 5) {
    try {
      // Récupérer tous les coupons actifs
      const activeCoupons = await db('coupons')
        .where({
          tenant_id: tenantId,
          is_active: true
        })
        .andWhere('start_date', '<=', new Date())
        .andWhere('end_date', '>=', new Date())
        .andWhere(function() {
          this.whereNull('usage_limit')
              .orWhereRaw('used_count < usage_limit');
        });

      const validCoupons = [];

      // Tester chaque coupon
      for (const coupon of activeCoupons) {
        const validationResult = await Coupon.validateCoupon(
          coupon.code,
          userId,
          orderData,
          tenantId
        );

        if (validationResult.isValid) {
          const applicationResult = await Coupon.applyCoupon(
            validationResult.coupon,
            orderData,
            validationResult.applicableItems
          );

          validCoupons.push({
            coupon: this.formatCouponForClient(coupon),
            discountAmount: applicationResult.discountAmount,
            savings: applicationResult.discountAmount,
            freeShipping: applicationResult.freeShipping
          });
        }
      }

      // Trier par montant de réduction décroissant
      validCoupons.sort((a, b) => b.discountAmount - a.discountAmount);

      return validCoupons.slice(0, limit);

    } catch (error) {
      console.error('Erreur recherche meilleurs coupons:', error);
      return [];
    }
  }

  /**
   * Calculer les promotions automatiques (ex: livraison gratuite)
   */
  static calculateAutomaticPromotions(orderData) {
    const promotions = [];

    // Livraison gratuite automatique
    if (orderData.subtotal >= 50000) { // 50,000 FCFA
      promotions.push({
        type: 'free_shipping',
        name: 'Livraison gratuite',
        description: 'Livraison offerte pour les commandes de 50 000 FCFA et plus',
        discountAmount: orderData.shipping_cost || 0,
        automatic: true
      });
    }

    // Réduction volume (exemple)
    if (orderData.subtotal >= 100000) { // 100,000 FCFA
      promotions.push({
        type: 'volume_discount',
        name: 'Réduction gros volume',
        description: '5% de réduction sur les commandes de 100 000 FCFA et plus',
        discountAmount: Math.round(orderData.subtotal * 0.05),
        automatic: true
      });
    }

    return promotions;
  }

  /**
   * Générer un code de coupon unique
   */
  static generateCouponCode(prefix = 'AFRIMOD', length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    
    for (let i = 0; i < length - prefix.length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * Créer un coupon de bienvenue pour un nouvel utilisateur
   */
  static async createWelcomeCoupon(userId, tenantId) {
    try {
      const welcomeCode = this.generateCouponCode('WELCOME', 10);
      
      const couponData = {
        code: welcomeCode,
        name: 'Coupon de bienvenue',
        description: 'Réduction de bienvenue pour votre première commande',
        type: 'percentage',
        value: 10, // 10%
        min_order_amount: 20000, // Minimum 20,000 FCFA
        max_discount_amount: 10000, // Maximum 10,000 FCFA de réduction
        usage_limit_per_user: 1,
        first_order_only: true,
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        created_by: userId,
        tenant_id: tenantId,
        allowed_user_roles: ['user']
      };

      return await Coupon.create(couponData);

    } catch (error) {
      console.error('Erreur création coupon bienvenue:', error);
      return null;
    }
  }

  /**
   * Créer un coupon d'anniversaire
   */
  static async createBirthdayCoupon(userId, userBirthday, tenantId) {
    try {
      const birthdayCode = this.generateCouponCode('BIRTHDAY', 10);
      
      const couponData = {
        code: birthdayCode,
        name: 'Coupon d\'anniversaire',
        description: 'Joyeux anniversaire ! Profitez de cette réduction spéciale',
        type: 'percentage',
        value: 15, // 15%
        min_order_amount: 15000,
        max_discount_amount: 15000,
        usage_limit_per_user: 1,
        start_date: new Date(userBirthday.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 jours avant
        end_date: new Date(userBirthday.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 jours après
        created_by: userId,
        tenant_id: tenantId,
        allowed_user_roles: ['user']
      };

      return await Coupon.create(couponData);

    } catch (error) {
      console.error('Erreur création coupon anniversaire:', error);
      return null;
    }
  }

  /**
   * Analyser l'efficacité des coupons
   */
  static async analyzeCouponEffectiveness(couponId, tenantId) {
    try {
      const stats = await db('coupon_usage')
        .where({ coupon_id: couponId, tenant_id: tenantId })
        .select(
          db.raw('COUNT(*) as usage_count'),
          db.raw('SUM(discount_amount) as total_discount'),
          db.raw('AVG(discount_amount) as avg_discount'),
          db.raw('SUM(order_total) as total_revenue_impact'),
          db.raw('AVG(order_total) as avg_order_value')
        )
        .first();

      const coupon = await Coupon.findById(couponId, tenantId);

      return {
        coupon: coupon,
        statistics: {
          usageCount: parseInt(stats.usage_count),
          totalDiscount: parseFloat(stats.total_discount) || 0,
          averageDiscount: parseFloat(stats.avg_discount) || 0,
          totalRevenueImpact: parseFloat(stats.total_revenue_impact) || 0,
          averageOrderValue: parseFloat(stats.avg_order_value) || 0,
          conversionRate: coupon.usage_limit ? (parseInt(stats.usage_count) / coupon.usage_limit) * 100 : null
        }
      };

    } catch (error) {
      console.error('Erreur analyse efficacité coupon:', error);
      return null;
    }
  }

  /**
   * Calculer les métriques de performance des coupons
   */
  static async getCouponMetrics(tenantId, period = '30d') {
    try {
      const dateFilter = this.getDateFilter(period);
      
      const metrics = await db('coupon_usage')
        .where('tenant_id', tenantId)
        .andWhere('created_at', '>=', dateFilter)
        .select(
          db.raw('COUNT(DISTINCT coupon_id) as active_coupons'),
          db.raw('COUNT(*) as total_usage'),
          db.raw('COUNT(DISTINCT user_id) as unique_users'),
          db.raw('SUM(discount_amount) as total_discount'),
          db.raw('AVG(discount_amount) as avg_discount'),
          db.raw('SUM(order_total) as total_order_value'),
          db.raw('AVG(order_total) as avg_order_value')
        )
        .first();

      return {
        period: period,
        activeCoupons: parseInt(metrics.active_coupons),
        totalUsage: parseInt(metrics.total_usage),
        uniqueUsers: parseInt(metrics.unique_users),
        totalDiscount: parseFloat(metrics.total_discount) || 0,
        averageDiscount: parseFloat(metrics.avg_discount) || 0,
        totalOrderValue: parseFloat(metrics.total_order_value) || 0,
        averageOrderValue: parseFloat(metrics.avg_order_value) || 0,
        discountRate: metrics.total_order_value > 0 ? 
          (parseFloat(metrics.total_discount) / parseFloat(metrics.total_order_value)) * 100 : 0
      };

    } catch (error) {
      console.error('Erreur métriques coupons:', error);
      return null;
    }
  }

  /**
   * Nettoyer les coupons expirés
   */
  static async cleanExpiredCoupons(tenantId) {
    try {
      const expiredCoupons = await db('coupons')
        .where('tenant_id', tenantId)
        .andWhere('end_date', '<', new Date())
        .andWhere('is_active', true)
        .update({ is_active: false });

      return {
        deactivatedCoupons: expiredCoupons
      };

    } catch (error) {
      console.error('Erreur nettoyage coupons expirés:', error);
      return null;
    }
  }

  /**
   * Méthodes utilitaires
   */
  
  static formatCouponForClient(coupon) {
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      min_order_amount: coupon.min_order_amount,
      end_date: coupon.end_date
    };
  }

  static getDateFilter(period) {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = PromotionService;