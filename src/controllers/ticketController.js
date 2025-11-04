const Ticket = require('../models/Ticket');
const { asyncHandler, commonErrors } = require('../middleware/errorHandler');
const { cache, CACHE_KEYS } = require('../config/redis');
const emailService = require('../services/emailService');

/**
 * Créer un nouveau ticket
 * POST /api/tickets
 */
const createTicket = asyncHandler(async (req, res) => {
  const {
    subject,
    description,
    priority = 'medium',
    category = 'general_support',
    orderId,
    productId,
    attachments = [],
    tags = []
  } = req.body;

  // Validation
  if (!subject || !description) {
    throw commonErrors.badRequest('Sujet et description sont requis');
  }

  if (subject.length < 5 || subject.length > 300) {
    throw commonErrors.badRequest('Le sujet doit contenir entre 5 et 300 caractères');
  }

  if (description.length < 10) {
    throw commonErrors.badRequest('La description doit contenir au moins 10 caractères');
  }

  // Créer le ticket
  const ticket = await Ticket.create({
    user_id: req.user.id,
    subject,
    description,
    priority,
    category,
    order_id: orderId,
    product_id: productId,
    attachments,
    tags,
    tenant_id: req.user.tenantId
  });

  // Envoyer notification email
  try {
    await emailService.sendTicketCreatedNotification(req.user, ticket);
  } catch (error) {
    console.error('Erreur envoi email ticket:', error);
  }

  // Invalider cache
  await cache.del(CACHE_KEYS.USER_TICKETS(req.user.id));

  res.status(201).json({
    success: true,
    message: 'Ticket créé avec succès',
    data: ticket
  });
});

/**
 * Obtenir tous les tickets (pour les clients)
 * GET /api/tickets
 */
const getUserTickets = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    priority,
    category,
    search
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    user_id: req.user.id,
    status,
    priority,
    category,
    search,
    tenant_id: req.user.tenantId
  };

  const result = await Ticket.getAll(options);

  res.json({
    success: true,
    data: result.tickets,
    pagination: result.pagination
  });
});

/**
 * Obtenir tous les tickets (pour les agents/admins)
 * GET /api/tickets/admin
 */
const getAllTickets = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    priority,
    category,
    department,
    assignedTo,
    userId,
    search
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    status,
    priority,
    category,
    department,
    assigned_to: assignedTo,
    user_id: userId,
    search,
    tenant_id: req.user.tenantId
  };

  const result = await Ticket.getAll(options);

  res.json({
    success: true,
    data: result.tickets,
    pagination: result.pagination
  });
});

/**
 * Obtenir un ticket par ID
 * GET /api/tickets/:id
 */
const getTicketById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeMessages = true } = req.query;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw commonErrors.notFound('Ticket');
  }

  // Vérifier les permissions
  const isOwner = ticket.customer.id === req.user.id;
  const isAgent = ['manager', 'admin', 'super_admin'].includes(req.user.role);
  const isAssignedAgent = ticket.agent && ticket.agent.id === req.user.id;

  if (!isOwner && !isAgent && !isAssignedAgent) {
    throw commonErrors.forbidden('Accès non autorisé à ce ticket');
  }

  let messages = [];
  if (includeMessages === 'true') {
    const includeInternal = isAgent || isAssignedAgent;
    messages = await Ticket.getMessages(id, { includeInternal });
  }

  res.json({
    success: true,
    data: {
      ...ticket,
      messages
    }
  });
});

/**
 * Obtenir un ticket par numéro
 * GET /api/tickets/number/:ticketNumber
 */
const getTicketByNumber = asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;

  const ticket = await Ticket.findByTicketNumber(ticketNumber);
  if (!ticket) {
    throw commonErrors.notFound('Ticket');
  }

  // Vérifier les permissions
  const isOwner = ticket.customer.id === req.user.id;
  const isAgent = ['manager', 'admin', 'super_admin'].includes(req.user.role);

  if (!isOwner && !isAgent) {
    throw commonErrors.forbidden('Accès non autorisé à ce ticket');
  }

  const includeInternal = isAgent;
  const messages = await Ticket.getMessages(ticket.id, { includeInternal });

  res.json({
    success: true,
    data: {
      ...ticket,
      messages
    }
  });
});

/**
 * Assigner un ticket à un agent
 * POST /api/tickets/:id/assign
 */
const assignTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;

  if (!agentId) {
    throw commonErrors.badRequest('Agent ID requis');
  }

  // Vérifier que l'agent existe et a le bon rôle
  const agent = await db('users')
    .where({ id: agentId })
    .whereIn('role', ['manager', 'admin', 'super_admin'])
    .whereNull('deleted_at')
    .first();

  if (!agent) {
    throw commonErrors.badRequest('Agent invalide');
  }

  const ticket = await Ticket.assign(id, agentId, req.user.id);

  // Notification email à l'agent
  try {
    await emailService.sendTicketAssignedNotification(agent, ticket);
  } catch (error) {
    console.error('Erreur envoi email assignment:', error);
  }

  res.json({
    success: true,
    message: 'Ticket assigné avec succès',
    data: ticket
  });
});

/**
 * Changer le statut d'un ticket
 * PUT /api/tickets/:id/status
 */
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ['open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated'];
  if (!validStatuses.includes(status)) {
    throw commonErrors.badRequest('Statut invalide');
  }

  const ticket = await Ticket.updateStatus(id, status, req.user.id, note);

  // Notification selon le nouveau statut
  try {
    if (status === 'resolved') {
      await emailService.sendTicketResolvedNotification(ticket);
    } else if (status === 'closed') {
      await emailService.sendTicketClosedNotification(ticket);
    }
  } catch (error) {
    console.error('Erreur envoi email statut:', error);
  }

  res.json({
    success: true,
    message: `Statut changé vers: ${status}`,
    data: ticket
  });
});

/**
 * Escalader un ticket
 * POST /api/tickets/:id/escalate
 */
const escalateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ticket = await Ticket.escalate(id, req.user.id, reason);

  // Notification aux managers
  try {
    await emailService.sendTicketEscalatedNotification(ticket, reason);
  } catch (error) {
    console.error('Erreur envoi email escalation:', error);
  }

  res.json({
    success: true,
    message: 'Ticket escaladé avec succès',
    data: ticket
  });
});

/**
 * Ajouter un message à un ticket
 * POST /api/tickets/:id/messages
 */
const addTicketMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message, messageType = 'customer_message', attachments = [] } = req.body;

  if (!message || message.trim().length === 0) {
    throw commonErrors.badRequest('Message requis');
  }

  // Vérifier les permissions pour les types de message
  const isAgent = ['manager', 'admin', 'super_admin'].includes(req.user.role);
  
  if (messageType === 'internal_note' && !isAgent) {
    throw commonErrors.forbidden('Seuls les agents peuvent ajouter des notes internes');
  }

  // Déterminer le type de message automatiquement si nécessaire
  let finalMessageType = messageType;
  if (messageType === 'customer_message') {
    finalMessageType = isAgent ? 'agent_response' : 'customer_message';
  }

  const ticketMessage = await Ticket.addMessage(id, req.user.id, message, finalMessageType, attachments);

  // Notification à l'autre partie
  try {
    const ticket = await Ticket.findById(id);
    if (finalMessageType === 'agent_response' && ticket) {
      await emailService.sendTicketResponseNotification(ticket, message);
    } else if (finalMessageType === 'customer_message' && ticket && ticket.agent) {
      await emailService.sendTicketMessageNotification(ticket, message);
    }
  } catch (error) {
    console.error('Erreur envoi email message:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Message ajouté avec succès',
    data: ticketMessage
  });
});

/**
 * Obtenir les messages d'un ticket
 * GET /api/tickets/:id/messages
 */
const getTicketMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50, includeInternal = false } = req.query;

  // Vérifier que le ticket existe et les permissions
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw commonErrors.notFound('Ticket');
  }

  const isOwner = ticket.customer.id === req.user.id;
  const isAgent = ['manager', 'admin', 'super_admin'].includes(req.user.role);

  if (!isOwner && !isAgent) {
    throw commonErrors.forbidden('Accès non autorisé');
  }

  const options = {
    includeInternal: (includeInternal === 'true') && isAgent,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100)
  };

  const messages = await Ticket.getMessages(id, options);

  res.json({
    success: true,
    data: messages
  });
});

/**
 * Obtenir les statistiques des tickets
 * GET /api/tickets/stats
 */
const getTicketStats = asyncHandler(async (req, res) => {
  const { period = '30d', userId, assignedTo } = req.query;

  const options = {
    period,
    user_id: userId,
    assigned_to: assignedTo
  };

  // Les clients ne peuvent voir que leurs propres stats
  if (req.user.role === 'customer') {
    options.user_id = req.user.id;
  }

  const stats = await Ticket.getStats(options);

  res.json({
    success: true,
    data: stats
  });
});

/**
 * Évaluer la satisfaction sur un ticket résolu
 * POST /api/tickets/:id/satisfaction
 */
const rateTicketSatisfaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw commonErrors.badRequest('Note de satisfaction requise (1-5)');
  }

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw commonErrors.notFound('Ticket');
  }

  if (ticket.customer.id !== req.user.id) {
    throw commonErrors.forbidden('Seul le créateur du ticket peut l\'évaluer');
  }

  if (!['resolved', 'closed'].includes(ticket.status)) {
    throw commonErrors.badRequest('Le ticket doit être résolu ou fermé pour être évalué');
  }

  await db('tickets')
    .where({ id })
    .update({
      satisfaction_rating: rating,
      satisfaction_comment: comment,
      updated_at: db.fn.now()
    });

  res.json({
    success: true,
    message: 'Évaluation enregistrée avec succès'
  });
});

/**
 * Fermer un ticket (client seulement)
 * POST /api/tickets/:id/close
 */
const closeTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw commonErrors.notFound('Ticket');
  }

  // Seul le client ou un agent peut fermer
  const isOwner = ticket.customer.id === req.user.id;
  const isAgent = ['manager', 'admin', 'super_admin'].includes(req.user.role);

  if (!isOwner && !isAgent) {
    throw commonErrors.forbidden('Accès non autorisé');
  }

  const updatedTicket = await Ticket.updateStatus(id, 'closed', req.user.id, reason);

  res.json({
    success: true,
    message: 'Ticket fermé avec succès',
    data: updatedTicket
  });
});

module.exports = {
  createTicket,
  getUserTickets,
  getAllTickets,
  getTicketById,
  getTicketByNumber,
  assignTicket,
  updateTicketStatus,
  escalateTicket,
  addTicketMessage,
  getTicketMessages,
  getTicketStats,
  rateTicketSatisfaction,
  closeTicket
};