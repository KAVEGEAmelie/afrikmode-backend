const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { handleValidationResult } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimiter');

// Rate limiting pour les tickets
const ticketLimiter = generalLimiter;

/**
 * @route POST /api/tickets
 * @desc Créer un nouveau ticket de support
 * @access Private (Client)
 */
router.post('/',
  requireAuth,
  ticketLimiter,
  [
    body('subject')
      .notEmpty()
      .withMessage('Sujet requis')
      .isLength({ min: 5, max: 300 })
      .withMessage('Le sujet doit contenir entre 5 et 300 caractères'),
    
    body('description')
      .notEmpty()
      .withMessage('Description requise')
      .isLength({ min: 10 })
      .withMessage('La description doit contenir au moins 10 caractères'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priorité invalide'),
    
    body('category')
      .optional()
      .isIn([
        'order_issue', 'payment_problem', 'product_question',
        'account_help', 'technical_issue', 'refund_request',
        'shipping_inquiry', 'general_support', 'bug_report', 'feature_request'
      ])
      .withMessage('Catégorie invalide'),
    
    body('orderId')
      .optional()
      .isUUID()
      .withMessage('ID commande invalide'),
    
    body('productId')
      .optional()
      .isUUID()
      .withMessage('ID produit invalide'),
    
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Les pièces jointes doivent être un tableau'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Les tags doivent être un tableau')
  ],
  handleValidationResult,
  ticketController.createTicket
);

/**
 * @route GET /api/tickets
 * @desc Obtenir les tickets de l'utilisateur connecté
 * @access Private (Client)
 */
router.get('/',
  requireAuth,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page doit être un entier positif'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite doit être entre 1 et 100'),
    
    query('status')
      .optional()
      .isIn(['open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated'])
      .withMessage('Statut invalide'),
    
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priorité invalide'),
    
    query('category')
      .optional()
      .isIn([
        'order_issue', 'payment_problem', 'product_question',
        'account_help', 'technical_issue', 'refund_request',
        'shipping_inquiry', 'general_support', 'bug_report', 'feature_request'
      ])
      .withMessage('Catégorie invalide')
  ],
  handleValidationResult,
  ticketController.getUserTickets
);

/**
 * @route GET /api/tickets/admin
 * @desc Obtenir tous les tickets (pour agents/admins)
 * @access Private (Manager/Admin)
 */
router.get('/admin',
  requireAuth,
  requireRole(['manager', 'admin', 'super_admin']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page doit être un entier positif'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite doit être entre 1 et 100'),
    
    query('assignedTo')
      .optional()
      .isUUID()
      .withMessage('ID agent invalide'),
    
    query('userId')
      .optional()
      .isUUID()
      .withMessage('ID utilisateur invalide'),
    
    query('department')
      .optional()
      .isIn(['customer_service', 'technical_support', 'billing', 'sales', 'management'])
      .withMessage('Département invalide')
  ],
  handleValidationResult,
  ticketController.getAllTickets
);

/**
 * @route GET /api/tickets/stats
 * @desc Obtenir les statistiques des tickets
 * @access Private
 */
router.get('/stats',
  requireAuth,
  [
    query('period')
      .optional()
      .matches(/^\d+d$/)
      .withMessage('Période invalide (format: 30d)'),
    
    query('userId')
      .optional()
      .isUUID()
      .withMessage('ID utilisateur invalide'),
    
    query('assignedTo')
      .optional()
      .isUUID()
      .withMessage('ID agent invalide')
  ],
  handleValidationResult,
  ticketController.getTicketStats
);

/**
 * @route GET /api/tickets/number/:ticketNumber
 * @desc Obtenir un ticket par son numéro
 * @access Private
 */
router.get('/number/:ticketNumber',
  requireAuth,
  [
    param('ticketNumber')
      .matches(/^AFM-\d{6}-[A-Z0-9]{4}$/)
      .withMessage('Format de numéro de ticket invalide')
  ],
  handleValidationResult,
  ticketController.getTicketByNumber
);

/**
 * @route GET /api/tickets/:id
 * @desc Obtenir un ticket par ID
 * @access Private
 */
router.get('/:id',
  requireAuth,
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    query('includeMessages')
      .optional()
      .isBoolean()
      .withMessage('includeMessages doit être un booléen')
  ],
  handleValidationResult,
  ticketController.getTicketById
);

/**
 * @route POST /api/tickets/:id/assign
 * @desc Assigner un ticket à un agent
 * @access Private (Manager/Admin)
 */
router.post('/:id/assign',
  requireAuth,
  requireRole(['manager', 'admin', 'super_admin']),
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    body('agentId')
      .notEmpty()
      .withMessage('ID agent requis')
      .isUUID()
      .withMessage('ID agent invalide')
  ],
  handleValidationResult,
  ticketController.assignTicket
);

/**
 * @route PUT /api/tickets/:id/status
 * @desc Changer le statut d'un ticket
 * @access Private (Agent/Admin)
 */
router.put('/:id/status',
  requireAuth,
  requireRole(['manager', 'admin', 'super_admin']),
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    body('status')
      .notEmpty()
      .withMessage('Statut requis')
      .isIn(['open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated'])
      .withMessage('Statut invalide'),
    
    body('note')
      .optional()
      .isLength({ max: 500 })
      .withMessage('La note ne peut pas dépasser 500 caractères')
  ],
  handleValidationResult,
  ticketController.updateTicketStatus
);

/**
 * @route POST /api/tickets/:id/escalate
 * @desc Escalader un ticket
 * @access Private (Agent/Admin)
 */
router.post('/:id/escalate',
  requireAuth,
  requireRole(['manager', 'admin', 'super_admin']),
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('La raison ne peut pas dépasser 500 caractères')
  ],
  handleValidationResult,
  ticketController.escalateTicket
);

/**
 * @route POST /api/tickets/:id/messages
 * @desc Ajouter un message à un ticket
 * @access Private
 */
router.post('/:id/messages',
  requireAuth,
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    body('message')
      .notEmpty()
      .withMessage('Message requis')
      .isLength({ min: 1, max: 5000 })
      .withMessage('Le message doit contenir entre 1 et 5000 caractères'),
    
    body('messageType')
      .optional()
      .isIn(['customer_message', 'agent_response', 'internal_note'])
      .withMessage('Type de message invalide'),
    
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Les pièces jointes doivent être un tableau')
  ],
  handleValidationResult,
  ticketController.addTicketMessage
);

/**
 * @route GET /api/tickets/:id/messages
 * @desc Obtenir les messages d'un ticket
 * @access Private
 */
router.get('/:id/messages',
  requireAuth,
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page doit être un entier positif'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite doit être entre 1 et 100'),
    
    query('includeInternal')
      .optional()
      .isBoolean()
      .withMessage('includeInternal doit être un booléen')
  ],
  handleValidationResult,
  ticketController.getTicketMessages
);

/**
 * @route POST /api/tickets/:id/satisfaction
 * @desc Évaluer la satisfaction sur un ticket
 * @access Private (Client propriétaire)
 */
router.post('/:id/satisfaction',
  requireAuth,
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    body('rating')
      .notEmpty()
      .withMessage('Note requise')
      .isInt({ min: 1, max: 5 })
      .withMessage('La note doit être entre 1 et 5'),
    
    body('comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Le commentaire ne peut pas dépasser 1000 caractères')
  ],
  handleValidationResult,
  ticketController.rateTicketSatisfaction
);

/**
 * @route POST /api/tickets/:id/close
 * @desc Fermer un ticket
 * @access Private
 */
router.post('/:id/close',
  requireAuth,
  [
    param('id')
      .isUUID()
      .withMessage('ID ticket invalide'),
    
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('La raison ne peut pas dépasser 500 caractères')
  ],
  handleValidationResult,
  ticketController.closeTicket
);

// Middleware pour gérer les erreurs de validation
router.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: error.details || []
    });
  }
  next(error);
});

module.exports = router;
