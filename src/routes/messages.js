const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification

/**
 * @route   POST /api/messages/conversations
 * @desc    Démarrer une nouvelle conversation avec un vendeur
 * @access  Private
 */
router.post('/conversations', requireAuth, messageController.startConversation);

/**
 * @route   GET /api/messages/conversations
 * @desc    Récupérer toutes les conversations de l'utilisateur
 * @access  Private
 */
router.get('/conversations', requireAuth, messageController.getConversations);

/**
 * @route   GET /api/messages/conversations/:id
 * @desc    Récupérer les messages d'une conversation
 * @access  Private
 */
router.get('/conversations/:id', requireAuth, messageController.getConversationMessages);

/**
 * @route   POST /api/messages/conversations/:id/send
 * @desc    Envoyer un message dans une conversation
 * @access  Private
 */
router.post('/conversations/:id/send', requireAuth, messageController.sendMessage);

/**
 * @route   PATCH /api/messages/conversations/:id/close
 * @desc    Fermer une conversation
 * @access  Private
 */
router.patch('/conversations/:id/close', requireAuth, messageController.closeConversation);

/**
 * @route   DELETE /api/messages/conversations/:id
 * @desc    Supprimer (archiver) une conversation
 * @access  Private
 */
router.delete('/conversations/:id', requireAuth, messageController.deleteConversation);

/**
 * @route   GET /api/messages/unread-count
 * @desc    Récupérer le nombre de messages non lus
 * @access  Private
 */
router.get('/unread-count', requireAuth, messageController.getUnreadCount);

module.exports = router;
