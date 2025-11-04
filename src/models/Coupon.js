/**
 * Modèle Coupon pour la gestion des promotions et coupons
 * Gère la validation, l'application et le suivi des coupons
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Coupon {
  
  /**
   * Créer un nouveau coupon
   */
  static async create(couponData) {
    try {
      const coupon = {
        id: uuidv4(),
        code: couponData.code.toUpperCase().trim(),
        name: couponData.name.trim(),
        description: couponData.description || null,
        type: couponData.type,
        value: parseFloat(couponData.value) || 0,
        max_discount_amount: couponData.max_discount_amount ? parseFloat(couponData.max_discount_amount) : null,
        min_order_amount: parseFloat(couponData.min_order_amount) || 0,
        usage_limit: couponData.usage_limit || null,
        usage_limit_per_user: parseInt(couponData.usage_limit_per_user) || 1,
        used_count: 0,
        start_date: new Date(couponData.start_date),
        end_date: new Date(couponData.end_date),
        is_active: couponData.is_active !== false,
        exclude_sale_items: couponData.exclude_sale_items === true,
        first_order_only: couponData.first_order_only === true,
        allowed_user_roles: JSON.stringify(couponData.allowed_user_roles || ['user']),
        included_product_ids: JSON.stringify(couponData.included_product_ids || []),
        excluded_product_ids: JSON.stringify(couponData.excluded_product_ids || []),
        included_category_ids: JSON.stringify(couponData.included_category_ids || []),
        excluded_category_ids: JSON.stringify(couponData.excluded_category_ids || []),
        buy_x_quantity: couponData.buy_x_quantity || null,
        get_y_quantity: couponData.get_y_quantity || null,
        get_y_product_id: couponData.get_y_product_id || null,
        shipping_zone_ids: JSON.stringify(couponData.shipping_zone_ids || []),
        created_by: couponData.created_by,
        tenant_id: couponData.tenant_id,
      };

      const [newCoupon] = await db('coupons').insert(coupon).returning('*');
      return this.formatCoupon(newCoupon);
    } catch (error) {
      throw new Error(`Erreur lors de la création du coupon: ${error.message}`);
    }
  }

  /**
   * Récupérer un coupon par son code
   */
  static async findByCode(code, tenantId) {
    try {
      const coupon = await db('coupons')
        .where({ code: code.toUpperCase().trim(), tenant_id: tenantId })
        .first();
      
      return coupon ? this.formatCoupon(coupon) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche du coupon: ${error.message}`);
    }
  }

  /**
   * Récupérer tous les coupons avec pagination et filtres
   */
  static async findAll(options = {}) {
    try {
      const {
        tenantId,
        page = 1,
        limit = 20,
        isActive = null,
        type = null,
        search = null
      } = options;

      let query = db('coupons')
        .where('tenant_id', tenantId);

      // Filtres
      if (isActive !== null) {
        query = query.andWhere('is_active', isActive);
      }

      if (type) {
        query = query.andWhere('type', type);
      }

      if (search) {
        query = query.andWhere(function() {
          this.where('code', 'ILIKE', `%${search}%`)
              .orWhere('name', 'ILIKE', `%${search}%`)
              .orWhere('description', 'ILIKE', `%${search}%`);
        });
      }

      // Pagination
      const offset = (page - 1) * limit;
      const total = await query.clone().count('* as count').first();
      
      const coupons = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        coupons: coupons.map(coupon => this.formatCoupon(coupon)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          totalPages: Math.ceil(total.count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des coupons: ${error.message}`);
    }
  }

  /**
   * Valider un coupon pour une commande
   */
  static async validateCoupon(code, userId, orderData, tenantId) {
    try {
      // Récupérer le coupon
      const coupon = await this.findByCode(code, tenantId);
      if (!coupon) {
        return { 
          isValid: false, 
          error: 'Code de coupon invalide',
          errorCode: 'COUPON_NOT_FOUND'
        };
      }

      // Vérifier si le coupon est actif
      if (!coupon.is_active) {
        return { 
          isValid: false, 
          error: 'Ce coupon n\'est plus actif',
          errorCode: 'COUPON_INACTIVE'
        };
      }

      // Vérifier les dates de validité
      const now = new Date();
      const startDate = new Date(coupon.start_date);
      const endDate = new Date(coupon.end_date);

      if (now < startDate) {
        return { 
          isValid: false, 
          error: 'Ce coupon n\'est pas encore valide',
          errorCode: 'COUPON_NOT_YET_VALID'
        };
      }

      if (now > endDate) {
        return { 
          isValid: false, 
          error: 'Ce coupon a expiré',
          errorCode: 'COUPON_EXPIRED'
        };
      }

      // Vérifier la limite globale d'utilisation
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return { 
          isValid: false, 
          error: 'Ce coupon a atteint sa limite d\'utilisation',
          errorCode: 'COUPON_USAGE_LIMIT_REACHED'
        };
      }

      // Vérifier la limite par utilisateur
      const userUsageCount = await this.getUserUsageCount(coupon.id, userId);
      if (coupon.usage_limit_per_user && userUsageCount >= coupon.usage_limit_per_user) {
        return { 
          isValid: false, 
          error: 'Vous avez déjà utilisé ce coupon le nombre maximum de fois',
          errorCode: 'USER_USAGE_LIMIT_REACHED'
        };
      }

      // Vérifier le montant minimum de commande
      if (coupon.min_order_amount && orderData.subtotal < coupon.min_order_amount) {
        return { 
          isValid: false, 
          error: `Montant minimum de ${coupon.min_order_amount} FCFA requis`,
          errorCode: 'MIN_ORDER_AMOUNT_NOT_REACHED'
        };
      }

      // Vérifier les restrictions de première commande
      if (coupon.first_order_only) {
        const userOrderCount = await this.getUserOrderCount(userId, tenantId);
        if (userOrderCount > 0) {
          return { 
            isValid: false, 
            error: 'Ce coupon est réservé à votre première commande',
            errorCode: 'NOT_FIRST_ORDER'
          };
        }
      }

      // Vérifier les restrictions de rôle utilisateur
      const user = await db('users').where('id', userId).first();
      const allowedRoles = JSON.parse(coupon.allowed_user_roles);
      if (!allowedRoles.includes(user.role)) {
        return { 
          isValid: false, 
          error: 'Ce coupon n\'est pas disponible pour votre type de compte',
          errorCode: 'ROLE_NOT_ALLOWED'
        };
      }

      // Vérifier les restrictions de produits/catégories
      const validationResult = await this.validateProductRestrictions(coupon, orderData.items);
      if (!validationResult.isValid) {
        return validationResult;
      }

      return { 
        isValid: true, 
        coupon,
        applicableItems: validationResult.applicableItems
      };

    } catch (error) {
      throw new Error(`Erreur lors de la validation du coupon: ${error.message}`);
    }
  }

  /**
   * Appliquer un coupon à une commande
   */
  static async applyCoupon(coupon, orderData, applicableItems) {
    try {
      let discountAmount = 0;
      let freeShipping = false;
      let freeItems = [];

      switch (coupon.type) {
        case 'percentage':
          discountAmount = this.calculatePercentageDiscount(coupon, orderData, applicableItems);
          break;

        case 'fixed_amount':
          discountAmount = Math.min(coupon.value, orderData.subtotal);
          break;

        case 'free_shipping':
          freeShipping = true;
          discountAmount = orderData.shipping_cost || 0;
          break;

        case 'buy_x_get_y':
          const buyXGetYResult = this.calculateBuyXGetY(coupon, orderData.items);
          discountAmount = buyXGetYResult.discountAmount;
          freeItems = buyXGetYResult.freeItems;
          break;

        case 'category_discount':
          discountAmount = this.calculateCategoryDiscount(coupon, orderData, applicableItems);
          break;

        default:
          throw new Error(`Type de coupon non supporté: ${coupon.type}`);
      }

      // Appliquer le montant maximum de réduction si défini
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }

      return {
        discountAmount: Math.round(discountAmount * 100) / 100, // Arrondir à 2 décimales
        freeShipping,
        freeItems,
        finalTotal: Math.max(0, orderData.total - discountAmount)
      };

    } catch (error) {
      throw new Error(`Erreur lors de l'application du coupon: ${error.message}`);
    }
  }

  /**
   * Enregistrer l'utilisation d'un coupon
   */
  static async recordUsage(couponId, userId, orderId, usageData, tenantId) {
    const trx = await db.transaction();
    
    try {
      // Enregistrer l'utilisation
      const usage = {
        id: uuidv4(),
        coupon_id: couponId,
        user_id: userId,
        order_id: orderId,
        discount_amount: usageData.discountAmount,
        order_total: usageData.orderTotal,
        final_total: usageData.finalTotal,
        coupon_type: usageData.couponType,
        coupon_value: usageData.couponValue,
        applied_to_items: JSON.stringify(usageData.appliedToItems || []),
        tenant_id: tenantId
      };

      await trx('coupon_usage').insert(usage);

      // Incrémenter le compteur d'utilisation du coupon
      await trx('coupons')
        .where('id', couponId)
        .increment('used_count', 1);

      await trx.commit();
      return usage;

    } catch (error) {
      await trx.rollback();
      throw new Error(`Erreur lors de l'enregistrement de l'utilisation: ${error.message}`);
    }
  }

  /**
   * Méthodes utilitaires privées
   */
  
  static calculatePercentageDiscount(coupon, orderData, applicableItems) {
    const applicableTotal = applicableItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    return (applicableTotal * coupon.value) / 100;
  }

  static calculateCategoryDiscount(coupon, orderData, applicableItems) {
    return this.calculatePercentageDiscount(coupon, orderData, applicableItems);
  }

  static calculateBuyXGetY(coupon, items) {
    // Logique Buy X Get Y - simplifié
    let discountAmount = 0;
    let freeItems = [];
    
    const eligibleQuantity = items.reduce((total, item) => total + item.quantity, 0);
    const freeQuantity = Math.floor(eligibleQuantity / coupon.buy_x_quantity) * coupon.get_y_quantity;
    
    if (freeQuantity > 0) {
      // Trouver l'item le moins cher pour l'offrir gratuitement
      const cheapestItem = items.reduce((min, item) => 
        item.price < min.price ? item : min
      );
      
      discountAmount = cheapestItem.price * Math.min(freeQuantity, cheapestItem.quantity);
      freeItems.push({
        productId: cheapestItem.product_id,
        quantity: Math.min(freeQuantity, cheapestItem.quantity)
      });
    }
    
    return { discountAmount, freeItems };
  }

  static async validateProductRestrictions(coupon, items) {
    const includedProducts = JSON.parse(coupon.included_product_ids);
    const excludedProducts = JSON.parse(coupon.excluded_product_ids);
    const includedCategories = JSON.parse(coupon.included_category_ids);
    const excludedCategories = JSON.parse(coupon.excluded_category_ids);

    let applicableItems = [...items];

    // Si des produits spécifiques sont inclus
    if (includedProducts.length > 0) {
      applicableItems = applicableItems.filter(item => 
        includedProducts.includes(item.product_id)
      );
    }

    // Exclure des produits spécifiques
    if (excludedProducts.length > 0) {
      applicableItems = applicableItems.filter(item => 
        !excludedProducts.includes(item.product_id)
      );
    }

    // Vérifier les catégories si nécessaire
    if (includedCategories.length > 0 || excludedCategories.length > 0) {
      const productIds = items.map(item => item.product_id);
      const products = await db('products')
        .whereIn('id', productIds)
        .select('id', 'category_id');

      applicableItems = applicableItems.filter(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return false;

        if (includedCategories.length > 0 && !includedCategories.includes(product.category_id)) {
          return false;
        }

        if (excludedCategories.length > 0 && excludedCategories.includes(product.category_id)) {
          return false;
        }

        return true;
      });
    }

    if (applicableItems.length === 0) {
      return {
        isValid: false,
        error: 'Ce coupon ne s\'applique à aucun produit de votre panier',
        errorCode: 'NO_APPLICABLE_PRODUCTS'
      };
    }

    return {
      isValid: true,
      applicableItems
    };
  }

  static async getUserUsageCount(couponId, userId) {
    const result = await db('coupon_usage')
      .where({ coupon_id: couponId, user_id: userId })
      .count('* as count')
      .first();
    
    return parseInt(result.count);
  }

  static async getUserOrderCount(userId, tenantId) {
    const result = await db('orders')
      .where({ user_id: userId, tenant_id: tenantId })
      .count('* as count')
      .first();
    
    return parseInt(result.count);
  }

  /**
   * Formater un coupon pour la réponse
   */
  static formatCoupon(coupon) {
    return {
      ...coupon,
      allowed_user_roles: JSON.parse(coupon.allowed_user_roles),
      included_product_ids: JSON.parse(coupon.included_product_ids),
      excluded_product_ids: JSON.parse(coupon.excluded_product_ids),
      included_category_ids: JSON.parse(coupon.included_category_ids),
      excluded_category_ids: JSON.parse(coupon.excluded_category_ids),
      shipping_zone_ids: JSON.parse(coupon.shipping_zone_ids)
    };
  }

  /**
   * Récupérer un coupon par son ID
   */
  static async findById(id, tenantId) {
    try {
      const coupon = await db('coupons')
        .where({ id, tenant_id: tenantId })
        .first();
      
      return coupon ? this.formatCoupon(coupon) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du coupon: ${error.message}`);
    }
  }

  /**
   * Obtenir les statistiques d'utilisation d'un coupon
   */
  static async getUsageStats(couponId, tenantId) {
    try {
      const coupon = await this.findById(couponId, tenantId);
      if (!coupon) return null;

      const stats = await db('coupon_usage')
        .where({ coupon_id: couponId, tenant_id: tenantId })
        .select(
          db.raw('COUNT(*) as total_usage'),
          db.raw('COUNT(DISTINCT user_id) as unique_users'),
          db.raw('SUM(discount_amount) as total_discount'),
          db.raw('AVG(discount_amount) as avg_discount'),
          db.raw('MIN(used_at) as first_used'),
          db.raw('MAX(used_at) as last_used')
        )
        .first();

      return {
        coupon,
        totalUsage: parseInt(stats.total_usage),
        uniqueUsers: parseInt(stats.unique_users),
        totalDiscount: parseFloat(stats.total_discount) || 0,
        averageDiscount: parseFloat(stats.avg_discount) || 0,
        firstUsed: stats.first_used,
        lastUsed: stats.last_used,
        remainingUsage: coupon.usage_limit ? coupon.usage_limit - coupon.used_count : null
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  /**
   * Obtenir l'historique d'utilisation des coupons par un utilisateur
   */
  static async getUserUsageHistory(userId, tenantId) {
    try {
      const history = await db('coupon_usage')
        .join('coupons', 'coupon_usage.coupon_id', 'coupons.id')
        .where('coupon_usage.user_id', userId)
        .andWhere('coupon_usage.tenant_id', tenantId)
        .select(
          'coupon_usage.*',
          'coupons.code',
          'coupons.name',
          'coupons.type'
        )
        .orderBy('coupon_usage.used_at', 'desc');

      return history;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }
  }

  /**
   * Supprimer un coupon
   */
  static async delete(id, tenantId) {
    try {
      const deleted = await db('coupons')
        .where({ id, tenant_id: tenantId })
        .del();
      
      return deleted > 0;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du coupon: ${error.message}`);
    }
  }

  /**
   * Mettre à jour un coupon
   */
  static async update(id, updateData, tenantId) {
    try {
      const [updatedCoupon] = await db('coupons')
        .where({ id, tenant_id: tenantId })
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');
      
      return updatedCoupon ? this.formatCoupon(updatedCoupon) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du coupon: ${error.message}`);
    }
  }
}

module.exports = Coupon;