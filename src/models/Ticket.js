const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Modèle Ticket - Gestion du système de support client
 */
class Ticket {
  /**
   * Créer un nouveau ticket
   */
  static async create(ticketData) {
    const {
      user_id,
      subject,
      description,
      priority = 'medium',
      category = 'general_support',
      order_id = null,
      product_id = null,
      attachments = [],
      tags = [],
      tenant_id = null
    } = ticketData;

    // Générer un numéro de ticket unique
    const ticket_number = await this.generateTicketNumber();
    
    // Générer un room ID pour le chat
    const chat_room_id = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const [ticket] = await db('tickets')
      .insert({
        ticket_number,
        user_id,
        subject,
        description,
        priority,
        category,
        order_id,
        product_id,
        attachments: JSON.stringify(attachments),
        tags: JSON.stringify(tags),
        chat_room_id,
        tenant_id,
        status: 'open',
        created_by: user_id
      })
      .returning('*');

    return this.formatTicket(ticket);
  }

  /**
   * Générer un numéro de ticket unique
   */
  static async generateTicketNumber() {
    const prefix = 'AFM';
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    let ticketNumber = `${prefix}-${timestamp.slice(-6)}-${random}`;
    
    // Vérifier l'unicité
    const existing = await db('tickets').where({ ticket_number: ticketNumber }).first();
    if (existing) {
      return this.generateTicketNumber(); // Réessayer si conflit
    }
    
    return ticketNumber;
  }

  /**
   * Trouver un ticket par ID
   */
  static async findById(id) {
    const ticket = await db('tickets')
      .select(
        'tickets.*',
        'users.first_name as customer_first_name',
        'users.last_name as customer_last_name',
        'users.email as customer_email',
        'agents.first_name as agent_first_name',
        'agents.last_name as agent_last_name',
        'orders.order_number',
        'products.name as product_name'
      )
      .leftJoin('users', 'tickets.user_id', 'users.id')
      .leftJoin('users as agents', 'tickets.assigned_to', 'agents.id')
      .leftJoin('orders', 'tickets.order_id', 'orders.id')
      .leftJoin('products', 'tickets.product_id', 'products.id')
      .where('tickets.id', id)
      .whereNull('tickets.deleted_at')
      .first();

    return ticket ? this.formatTicket(ticket) : null;
  }

  /**
   * Trouver un ticket par numéro
   */
  static async findByTicketNumber(ticketNumber) {
    const ticket = await db('tickets')
      .select(
        'tickets.*',
        'users.first_name as customer_first_name',
        'users.last_name as customer_last_name',
        'users.email as customer_email',
        'agents.first_name as agent_first_name',
        'agents.last_name as agent_last_name'
      )
      .leftJoin('users', 'tickets.user_id', 'users.id')
      .leftJoin('users as agents', 'tickets.assigned_to', 'agents.id')
      .where('tickets.ticket_number', ticketNumber)
      .whereNull('tickets.deleted_at')
      .first();

    return ticket ? this.formatTicket(ticket) : null;
  }

  /**
   * Obtenir tous les tickets avec filtres
   */
  static async getAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      user_id = null,
      assigned_to = null,
      status = null,
      priority = null,
      category = null,
      department = null,
      search = null,
      tenant_id = null
    } = options;

    const offset = (page - 1) * limit;

    let query = db('tickets')
      .select(
        'tickets.*',
        'users.first_name as customer_first_name',
        'users.last_name as customer_last_name',
        'users.email as customer_email',
        'agents.first_name as agent_first_name',
        'agents.last_name as agent_last_name'
      )
      .leftJoin('users', 'tickets.user_id', 'users.id')
      .leftJoin('users as agents', 'tickets.assigned_to', 'agents.id')
      .whereNull('tickets.deleted_at');

    // Filtres
    if (user_id) query = query.where('tickets.user_id', user_id);
    if (assigned_to) query = query.where('tickets.assigned_to', assigned_to);
    if (status) query = query.where('tickets.status', status);
    if (priority) query = query.where('tickets.priority', priority);
    if (category) query = query.where('tickets.category', category);
    if (department) query = query.where('tickets.department', department);
    if (tenant_id) query = query.where('tickets.tenant_id', tenant_id);

    // Recherche textuelle
    if (search) {
      query = query.where(function() {
        this.where('tickets.subject', 'ilike', `%${search}%`)
          .orWhere('tickets.description', 'ilike', `%${search}%`)
          .orWhere('tickets.ticket_number', 'ilike', `%${search}%`)
          .orWhere('users.first_name', 'ilike', `%${search}%`)
          .orWhere('users.last_name', 'ilike', `%${search}%`)
          .orWhere('users.email', 'ilike', `%${search}%`);
      });
    }

    // Total pour pagination
    const [{ count: total }] = await query.clone().count('tickets.id as count');

    // Résultats paginés
    const tickets = await query
      .orderBy('tickets.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      tickets: tickets.map(ticket => this.formatTicket(ticket)),
      pagination: {
        page,
        limit,
        total: parseInt(total),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Assigner un ticket à un agent
   */
  static async assign(ticketId, agentId, assignedBy) {
    const ticket = await this.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket non trouvé');
    }

    const [updatedTicket] = await db('tickets')
      .where({ id: ticketId })
      .update({
        assigned_to: agentId,
        status: 'in_progress',
        updated_by: assignedBy,
        updated_at: db.fn.now()
      })
      .returning('*');

    // Ajouter une note système
    await this.addSystemMessage(ticketId, assignedBy, `Ticket assigné à l'agent`, {
      action: 'assigned',
      agent_id: agentId
    });

    return this.formatTicket(updatedTicket);
  }

  /**
   * Changer le statut d'un ticket
   */
  static async updateStatus(ticketId, newStatus, updatedBy, note = null) {
    const ticket = await this.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket non trouvé');
    }

    const updateData = {
      status: newStatus,
      updated_by: updatedBy,
      updated_at: db.fn.now()
    };

    // Timestamps spéciaux selon le statut
    if (newStatus === 'resolved') {
      updateData.resolved_at = db.fn.now();
    } else if (newStatus === 'closed') {
      updateData.closed_at = db.fn.now();
    }

    const [updatedTicket] = await db('tickets')
      .where({ id: ticketId })
      .update(updateData)
      .returning('*');

    // Ajouter une note système
    const message = note || `Statut changé vers: ${newStatus}`;
    await this.addSystemMessage(ticketId, updatedBy, message, {
      action: 'status_changed',
      old_status: ticket.status,
      new_status: newStatus
    });

    return this.formatTicket(updatedTicket);
  }

  /**
   * Escalader un ticket
   */
  static async escalate(ticketId, escalatedBy, reason = null) {
    const ticket = await this.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket non trouvé');
    }

    const [updatedTicket] = await db('tickets')
      .where({ id: ticketId })
      .update({
        status: 'escalated',
        escalation_level: (ticket.escalation_level || 0) + 1,
        escalated_by: escalatedBy,
        escalated_at: db.fn.now(),
        department: 'management', // Escalade vers management
        updated_by: escalatedBy,
        updated_at: db.fn.now()
      })
      .returning('*');

    // Ajouter une note système
    const message = `Ticket escaladé (niveau ${updatedTicket.escalation_level})${reason ? ': ' + reason : ''}`;
    await this.addSystemMessage(ticketId, escalatedBy, message, {
      action: 'escalated',
      escalation_level: updatedTicket.escalation_level,
      reason
    });

    return this.formatTicket(updatedTicket);
  }

  /**
   * Ajouter un message au ticket
   */
  static async addMessage(ticketId, userId, message, messageType = 'customer_message', attachments = []) {
    const [ticketMessage] = await db('ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        message,
        message_type: messageType,
        attachments: JSON.stringify(attachments),
        is_public: messageType !== 'internal_note'
      })
      .returning('*');

    // Mettre à jour le timestamp du ticket
    await db('tickets')
      .where({ id: ticketId })
      .update({ 
        updated_at: db.fn.now(),
        updated_by: userId
      });

    // Marquer la première réponse si c'est un agent
    if (messageType === 'agent_response') {
      const ticket = await this.findById(ticketId);
      if (!ticket.first_response_at) {
        const responseTime = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60));
        await db('tickets')
          .where({ id: ticketId })
          .update({ 
            first_response_at: db.fn.now(),
            first_response_time: responseTime
          });
      }
    }

    return this.formatMessage(ticketMessage);
  }

  /**
   * Ajouter une note système
   */
  static async addSystemMessage(ticketId, userId, message, metadata = {}) {
    return this.addMessage(ticketId, userId, message, 'system_note', []);
  }

  /**
   * Obtenir les messages d'un ticket
   */
  static async getMessages(ticketId, options = {}) {
    const { includeInternal = false, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let query = db('ticket_messages')
      .select(
        'ticket_messages.*',
        'users.first_name',
        'users.last_name',
        'users.avatar_url',
        'users.role'
      )
      .leftJoin('users', 'ticket_messages.user_id', 'users.id')
      .where('ticket_messages.ticket_id', ticketId)
      .whereNull('ticket_messages.deleted_at');

    if (!includeInternal) {
      query = query.where('ticket_messages.is_internal', false);
    }

    const messages = await query
      .orderBy('ticket_messages.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    return messages.map(message => this.formatMessage(message));
  }

  /**
   * Statistiques des tickets
   */
  static async getStats(options = {}) {
    const { user_id = null, assigned_to = null, period = '30d' } = options;

    let baseQuery = db('tickets')
      .whereNull('deleted_at');

    if (user_id) baseQuery = baseQuery.where('user_id', user_id);
    if (assigned_to) baseQuery = baseQuery.where('assigned_to', assigned_to);

    // Période
    if (period) {
      const days = parseInt(period.replace('d', ''));
      baseQuery = baseQuery.where('created_at', '>=', db.raw(`CURRENT_DATE - INTERVAL '${days} days'`));
    }

    const [stats] = await baseQuery
      .select([
        db.raw('COUNT(*) as total_tickets'),
        db.raw('COUNT(*) FILTER (WHERE status = \'open\') as open_tickets'),
        db.raw('COUNT(*) FILTER (WHERE status = \'in_progress\') as in_progress_tickets'),
        db.raw('COUNT(*) FILTER (WHERE status = \'resolved\') as resolved_tickets'),
        db.raw('COUNT(*) FILTER (WHERE status = \'closed\') as closed_tickets'),
        db.raw('COUNT(*) FILTER (WHERE priority = \'urgent\') as urgent_tickets'),
        db.raw('AVG(first_response_time) as avg_first_response_time'),
        db.raw('AVG(resolution_time) as avg_resolution_time'),
        db.raw('AVG(satisfaction_rating) as avg_satisfaction_rating')
      ]);

    return stats;
  }

  /**
   * Formater un ticket pour l'API
   */
  static formatTicket(ticket) {
    if (!ticket) return null;

    return {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      department: ticket.department,
      
      // Relations
      customer: {
        id: ticket.user_id,
        name: `${ticket.customer_first_name} ${ticket.customer_last_name}`,
        email: ticket.customer_email
      },
      
      agent: ticket.assigned_to ? {
        id: ticket.assigned_to,
        name: `${ticket.agent_first_name} ${ticket.agent_last_name}`
      } : null,

      // Metadata
      orderId: ticket.order_id,
      orderNumber: ticket.order_number,
      productId: ticket.product_id,
      productName: ticket.product_name,
      attachments: this.parseJSON(ticket.attachments),
      tags: this.parseJSON(ticket.tags),
      
      // Chat
      chatEnabled: ticket.chat_enabled,
      chatRoomId: ticket.chat_room_id,
      
      // SLA & Performance
      firstResponseAt: ticket.first_response_at,
      resolvedAt: ticket.resolved_at,
      closedAt: ticket.closed_at,
      firstResponseTime: ticket.first_response_time,
      resolutionTime: ticket.resolution_time,
      
      // Satisfaction
      satisfactionRating: ticket.satisfaction_rating,
      satisfactionComment: ticket.satisfaction_comment,
      
      // Escalation
      escalationLevel: ticket.escalation_level,
      escalatedBy: ticket.escalated_by,
      escalatedAt: ticket.escalated_at,
      
      // Timestamps
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    };
  }

  /**
   * Formater un message pour l'API
   */
  static formatMessage(message) {
    if (!message) return null;

    return {
      id: message.id,
      ticketId: message.ticket_id,
      message: message.message,
      messageType: message.message_type,
      isPublic: message.is_public,
      isInternal: message.is_internal,
      
      author: {
        id: message.user_id,
        name: `${message.first_name} ${message.last_name}`,
        avatar: message.avatar_url,
        role: message.role
      },
      
      attachments: this.parseJSON(message.attachments),
      metadata: this.parseJSON(message.metadata),
      
      readByCustomer: message.read_by_customer,
      readByAgent: message.read_by_agent,
      readAt: message.read_at,
      
      createdAt: message.created_at,
      updatedAt: message.updated_at
    };
  }

  /**
   * Parser JSON en toute sécurité
   */
  static parseJSON(jsonString) {
    if (!jsonString) return [];
    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (e) {
      return [];
    }
  }
}

module.exports = Ticket;