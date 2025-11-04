const db = require('../config/database');

/**
 * Service de segmentation des clients
 */
class CustomerSegmentationService {
  constructor() {
    this.defaultSegments = [
      {
        name: 'Nouveaux clients',
        type: 'new_customers',
        description: 'Clients inscrits dans les 30 derniers jours',
        criteria: {
          registration_days: 30,
          order_count: 0
        }
      },
      {
        name: 'Clients fidèles',
        type: 'loyal_customers', 
        description: 'Clients avec plus de 5 commandes',
        criteria: {
          min_orders: 5,
          registration_days_min: 90
        }
      },
      {
        name: 'Clients inactifs',
        type: 'inactive_customers',
        description: 'Clients sans commande depuis 60 jours',
        criteria: {
          last_order_days: 60,
          min_orders: 1
        }
      },
      {
        name: 'Clients à forte valeur',
        type: 'high_value_customers',
        description: 'Clients avec un panier moyen > 100€',
        criteria: {
          min_avg_order_value: 100,
          min_orders: 3
        }
      },
      {
        name: 'Clients VIP',
        type: 'vip_customers',
        description: 'Clients avec plus de 1000€ de commandes',
        criteria: {
          min_total_spent: 1000
        }
      }
    ];
  }

  /**
   * Crée un nouveau segment personnalisé
   */
  async createSegment(segmentData, userId) {
    const {
      name,
      description,
      type,
      criteria
    } = segmentData;

    // Validation des critères
    this.validateCriteria(criteria);

    const [segment] = await db('customer_segments').insert({
      name,
      description,
      type,
      criteria: JSON.stringify(criteria),
      created_by: userId,
      is_active: true
    }).returning('*');

    // Calculer immédiatement le nombre de clients dans ce segment
    const customerCount = await this.calculateSegmentSize(segment.id);
    
    await db('customer_segments')
      .where('id', segment.id)
      .update({
        customer_count: customerCount,
        last_calculated_at: new Date()
      });

    return {
      ...segment,
      criteria: JSON.parse(segment.criteria),
      customer_count: customerCount
    };
  }

  /**
   * Met à jour un segment existant
   */
  async updateSegment(segmentId, updateData, userId) {
    const segment = await db('customer_segments')
      .where('id', segmentId)
      .where('created_by', userId)
      .first();

    if (!segment) {
      throw new Error('Segment non trouvé');
    }

    if (updateData.criteria) {
      this.validateCriteria(updateData.criteria);
      updateData.criteria = JSON.stringify(updateData.criteria);
    }

    const [updatedSegment] = await db('customer_segments')
      .where('id', segmentId)
      .update(updateData)
      .returning('*');

    // Recalculer le nombre de clients si les critères ont changé
    if (updateData.criteria) {
      const customerCount = await this.calculateSegmentSize(segmentId);
      
      await db('customer_segments')
        .where('id', segmentId)
        .update({
          customer_count: customerCount,
          last_calculated_at: new Date()
        });

      updatedSegment.customer_count = customerCount;
    }

    return {
      ...updatedSegment,
      criteria: JSON.parse(updatedSegment.criteria)
    };
  }

  /**
   * Supprime un segment
   */
  async deleteSegment(segmentId, userId) {
    const deleted = await db('customer_segments')
      .where('id', segmentId)
      .where('created_by', userId)
      .del();

    if (!deleted) {
      throw new Error('Segment non trouvé');
    }

    return true;
  }

  /**
   * Récupère tous les segments d'un utilisateur
   */
  async getUserSegments(userId, includeInactive = false) {
    let query = db('customer_segments')
      .where('created_by', userId);

    if (!includeInactive) {
      query = query.where('is_active', true);
    }

    const segments = await query
      .orderBy('created_at', 'desc')
      .select('*');

    return segments.map(segment => ({
      ...segment,
      criteria: JSON.parse(segment.criteria)
    }));
  }

  /**
   * Récupère un segment spécifique
   */
  async getSegment(segmentId, userId) {
    const segment = await db('customer_segments')
      .where('id', segmentId)
      .where('created_by', userId)
      .first();

    if (!segment) {
      throw new Error('Segment non trouvé');
    }

    return {
      ...segment,
      criteria: JSON.parse(segment.criteria)
    };
  }

  /**
   * Calcule la taille d'un segment
   */
  async calculateSegmentSize(segmentId) {
    const segment = await db('customer_segments')
      .where('id', segmentId)
      .first();

    if (!segment) {
      return 0;
    }

    const criteria = JSON.parse(segment.criteria);
    const customers = await this.getCustomersForCriteria(criteria);
    
    return customers.length;
  }

  /**
   * Récupère les clients correspondant à un segment
   */
  async getSegmentCustomers(segmentId, limit = 100, offset = 0) {
    const segment = await db('customer_segments')
      .where('id', segmentId)
      .first();

    if (!segment) {
      throw new Error('Segment non trouvé');
    }

    const criteria = JSON.parse(segment.criteria);
    const customers = await this.getCustomersForCriteria(criteria, limit, offset);
    
    return {
      segment: {
        ...segment,
        criteria
      },
      customers,
      total_count: await this.calculateSegmentSize(segmentId)
    };
  }

  /**
   * Récupère les clients selon des critères
   */
  async getCustomersForCriteria(criteria, limit = null, offset = 0) {
    // Requête de base pour les utilisateurs clients
    let query = db('users')
      .leftJoin(
        db('orders')
          .select('user_id')
          .count('* as order_count')
          .sum('total_amount as total_spent')
          .avg('total_amount as avg_order_value')
          .max('created_at as last_order_at')
          .groupBy('user_id')
          .as('order_stats'),
        'users.id',
        'order_stats.user_id'
      )
      .select(
        'users.*',
        db.raw('COALESCE(order_stats.order_count, 0) as order_count'),
        db.raw('COALESCE(order_stats.total_spent, 0) as total_spent'),
        db.raw('COALESCE(order_stats.avg_order_value, 0) as avg_order_value'),
        'order_stats.last_order_at'
      )
      .where('users.role', 'customer');

    // Appliquer les critères
    if (criteria.registration_days !== undefined) {
      const cutoffDate = new Date(Date.now() - criteria.registration_days * 24 * 60 * 60 * 1000);
      query = query.where('users.created_at', '>=', cutoffDate);
    }

    if (criteria.registration_days_min !== undefined) {
      const cutoffDate = new Date(Date.now() - criteria.registration_days_min * 24 * 60 * 60 * 1000);
      query = query.where('users.created_at', '<=', cutoffDate);
    }

    if (criteria.min_orders !== undefined) {
      query = query.havingRaw('COALESCE(order_stats.order_count, 0) >= ?', [criteria.min_orders]);
    }

    if (criteria.max_orders !== undefined) {
      query = query.havingRaw('COALESCE(order_stats.order_count, 0) <= ?', [criteria.max_orders]);
    }

    if (criteria.order_count !== undefined) {
      query = query.havingRaw('COALESCE(order_stats.order_count, 0) = ?', [criteria.order_count]);
    }

    if (criteria.min_total_spent !== undefined) {
      query = query.havingRaw('COALESCE(order_stats.total_spent, 0) >= ?', [criteria.min_total_spent]);
    }

    if (criteria.min_avg_order_value !== undefined) {
      query = query.havingRaw('COALESCE(order_stats.avg_order_value, 0) >= ?', [criteria.min_avg_order_value]);
    }

    if (criteria.last_order_days !== undefined) {
      const cutoffDate = new Date(Date.now() - criteria.last_order_days * 24 * 60 * 60 * 1000);
      query = query.where(function() {
        this.where('order_stats.last_order_at', '<', cutoffDate)
            .orWhereNull('order_stats.last_order_at');
      });
    }

    // Pagination
    if (limit) {
      query = query.limit(limit).offset(offset);
    }

    return await query;
  }

  /**
   * Initialise les segments par défaut pour un utilisateur
   */
  async initializeDefaultSegments(userId) {
    const existingSegments = await db('customer_segments')
      .where('created_by', userId)
      .select('type');

    const existingTypes = existingSegments.map(s => s.type);

    const segmentsToCreate = this.defaultSegments.filter(
      segment => !existingTypes.includes(segment.type)
    );

    const createdSegments = [];

    for (let segmentData of segmentsToCreate) {
      try {
        const segment = await this.createSegment(segmentData, userId);
        createdSegments.push(segment);
      } catch (error) {
        console.error(`Erreur création segment ${segmentData.name}:`, error);
      }
    }

    return createdSegments;
  }

  /**
   * Recalcule tous les segments d'un utilisateur
   */
  async recalculateAllSegments(userId) {
    const segments = await db('customer_segments')
      .where('created_by', userId)
      .where('is_active', true)
      .select('*');

    const results = [];

    for (let segment of segments) {
      try {
        const customerCount = await this.calculateSegmentSize(segment.id);
        
        await db('customer_segments')
          .where('id', segment.id)
          .update({
            customer_count: customerCount,
            last_calculated_at: new Date()
          });

        results.push({
          segment_id: segment.id,
          name: segment.name,
          customer_count: customerCount,
          updated: true
        });
      } catch (error) {
        console.error(`Erreur recalcul segment ${segment.name}:`, error);
        results.push({
          segment_id: segment.id,
          name: segment.name,
          error: error.message,
          updated: false
        });
      }
    }

    return results;
  }

  /**
   * Statistiques globales de segmentation
   */
  async getSegmentationStats(userId) {
    // Total des segments
    const totalSegments = await db('customer_segments')
      .where('created_by', userId)
      .count('* as count')
      .first();

    // Segments actifs
    const activeSegments = await db('customer_segments')
      .where('created_by', userId)
      .where('is_active', true)
      .count('* as count')
      .first();

    // Total des clients uniques dans tous les segments
    const segmentsData = await db('customer_segments')
      .where('created_by', userId)
      .where('is_active', true)
      .select('*');

    let allCustomerIds = new Set();
    
    for (let segment of segmentsData) {
      const criteria = JSON.parse(segment.criteria);
      const customers = await this.getCustomersForCriteria(criteria);
      customers.forEach(customer => allCustomerIds.add(customer.id));
    }

    // Répartition par type
    const byType = await db('customer_segments')
      .where('created_by', userId)
      .select('type')
      .count('* as count')
      .groupBy('type');

    return {
      total_segments: parseInt(totalSegments.count),
      active_segments: parseInt(activeSegments.count),
      unique_customers_in_segments: allCustomerIds.size,
      by_type: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      last_updated: new Date().toISOString()
    };
  }

  // ================= HELPERS =================

  /**
   * Valide les critères de segmentation
   */
  validateCriteria(criteria) {
    const allowedFields = [
      'registration_days',
      'registration_days_min',
      'min_orders',
      'max_orders',
      'order_count',
      'min_total_spent',
      'max_total_spent',
      'min_avg_order_value',
      'max_avg_order_value',
      'last_order_days'
    ];

    for (let field in criteria) {
      if (!allowedFields.includes(field)) {
        throw new Error(`Critère non supporté: ${field}`);
      }

      if (typeof criteria[field] !== 'number' || criteria[field] < 0) {
        throw new Error(`Valeur invalide pour ${field}: doit être un nombre positif`);
      }
    }

    return true;
  }

  /**
   * Obtient une description lisible des critères
   */
  getCriteriaDescription(criteria) {
    const descriptions = [];

    if (criteria.registration_days !== undefined) {
      descriptions.push(`Inscrits dans les ${criteria.registration_days} derniers jours`);
    }

    if (criteria.registration_days_min !== undefined) {
      descriptions.push(`Inscrits depuis plus de ${criteria.registration_days_min} jours`);
    }

    if (criteria.min_orders !== undefined) {
      descriptions.push(`Au moins ${criteria.min_orders} commande(s)`);
    }

    if (criteria.max_orders !== undefined) {
      descriptions.push(`Maximum ${criteria.max_orders} commande(s)`);
    }

    if (criteria.order_count !== undefined) {
      descriptions.push(`Exactement ${criteria.order_count} commande(s)`);
    }

    if (criteria.min_total_spent !== undefined) {
      descriptions.push(`Dépensé au moins ${criteria.min_total_spent}€`);
    }

    if (criteria.min_avg_order_value !== undefined) {
      descriptions.push(`Panier moyen d'au moins ${criteria.min_avg_order_value}€`);
    }

    if (criteria.last_order_days !== undefined) {
      descriptions.push(`Pas de commande depuis ${criteria.last_order_days} jours`);
    }

    return descriptions.join(' ET ');
  }
}

module.exports = new CustomerSegmentationService();