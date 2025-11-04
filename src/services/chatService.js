const jwt = require('jsonwebtoken');
const Ticket = require('../models/Ticket');
const db = require('../config/database');

/**
 * Service de chat temps réel pour les tickets de support
 */
class ChatService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socket
    this.agentSockets = new Map(); // agentId -> socket
    
    this.setupSocketHandlers();
  }

  /**
   * Configuration des gestionnaires Socket.io
   */
  setupSocketHandlers() {
    // Middleware d'authentification Socket.io
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Token manquant'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db('users')
          .where({ id: decoded.userId })
          .whereNull('deleted_at')
          .first();

        if (!user) {
          return next(new Error('Utilisateur non trouvé'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        socket.userName = `${user.first_name} ${user.last_name}`;
        
        next();
      } catch (error) {
        next(new Error('Token invalide'));
      }
    });

    // Connexion
    this.io.on('connection', (socket) => {
      console.log(`Utilisateur connecté: ${socket.userName} (${socket.userId})`);
      
      this.handleUserConnection(socket);
      this.handleTicketJoin(socket);
      this.handleTicketLeave(socket);
      this.handleSendMessage(socket);
      this.handleTypingStart(socket);
      this.handleTypingStop(socket);
      this.handleDisconnection(socket);
    });
  }

  /**
   * Gérer la connexion d'un utilisateur
   */
  handleUserConnection(socket) {
    // Enregistrer la connexion
    this.connectedUsers.set(socket.userId, socket);
    
    // Si c'est un agent, l'ajouter à la liste des agents
    if (['manager', 'admin', 'super_admin'].includes(socket.userRole)) {
      this.agentSockets.set(socket.userId, socket);
      
      // Notifier les autres agents qu'un agent est en ligne
      socket.broadcast.to('agents').emit('agent_online', {
        agentId: socket.userId,
        agentName: socket.userName,
        timestamp: new Date().toISOString()
      });
      
      // Rejoindre la room des agents
      socket.join('agents');
    }

    // Envoyer les statistiques de connexion
    socket.emit('connection_success', {
      userId: socket.userId,
      role: socket.userRole,
      onlineUsers: this.connectedUsers.size,
      onlineAgents: this.agentSockets.size
    });
  }

  /**
   * Rejoindre un ticket (chat room)
   */
  handleTicketJoin(socket) {
    socket.on('join_ticket', async (data) => {
      try {
        const { ticketId } = data;
        
        // Vérifier que le ticket existe et les permissions
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          socket.emit('error', { message: 'Ticket non trouvé' });
          return;
        }

        // Vérifier les permissions
        const isOwner = ticket.customer.id === socket.userId;
        const isAgent = ['manager', 'admin', 'super_admin'].includes(socket.userRole);
        const isAssignedAgent = ticket.agent && ticket.agent.id === socket.userId;

        if (!isOwner && !isAgent && !isAssignedAgent) {
          socket.emit('error', { message: 'Accès non autorisé à ce ticket' });
          return;
        }

        // Rejoindre la room du ticket
        const roomId = `ticket_${ticketId}`;
        socket.join(roomId);
        socket.currentTicket = ticketId;
        
        // Activer le chat pour ce ticket si pas déjà fait
        if (!ticket.chatEnabled) {
          await db('tickets')
            .where({ id: ticketId })
            .update({ 
              chat_enabled: true,
              updated_at: db.fn.now()
            });
        }

        // Notifier les autres participants
        socket.to(roomId).emit('user_joined_ticket', {
          userId: socket.userId,
          userName: socket.userName,
          role: socket.userRole,
          ticketId,
          timestamp: new Date().toISOString()
        });

        // Confirmer la connexion au ticket
        socket.emit('ticket_joined', {
          ticketId,
          roomId,
          ticket: ticket,
          participants: await this.getTicketParticipants(roomId)
        });

        console.log(`${socket.userName} a rejoint le ticket ${ticket.ticketNumber}`);

      } catch (error) {
        console.error('Erreur join_ticket:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion au ticket' });
      }
    });
  }

  /**
   * Quitter un ticket
   */
  handleTicketLeave(socket) {
    socket.on('leave_ticket', (data) => {
      const { ticketId } = data;
      const roomId = `ticket_${ticketId}`;
      
      socket.leave(roomId);
      socket.currentTicket = null;
      
      // Notifier les autres participants
      socket.to(roomId).emit('user_left_ticket', {
        userId: socket.userId,
        userName: socket.userName,
        ticketId,
        timestamp: new Date().toISOString()
      });
      
      socket.emit('ticket_left', { ticketId });
      console.log(`${socket.userName} a quitté le ticket ${ticketId}`);
    });
  }

  /**
   * Envoyer un message dans le chat
   */
  handleSendMessage(socket) {
    socket.on('send_message', async (data) => {
      try {
        const { ticketId, message, messageType = 'customer_message', attachments = [] } = data;
        
        if (!message || message.trim().length === 0) {
          socket.emit('error', { message: 'Message vide' });
          return;
        }

        // Vérifier les permissions
        const isAgent = ['manager', 'admin', 'super_admin'].includes(socket.userRole);
        let finalMessageType = messageType;
        
        if (messageType === 'customer_message') {
          finalMessageType = isAgent ? 'agent_response' : 'customer_message';
        }

        if (messageType === 'internal_note' && !isAgent) {
          socket.emit('error', { message: 'Accès non autorisé aux notes internes' });
          return;
        }

        // Sauvegarder le message en base
        const ticketMessage = await Ticket.addMessage(
          ticketId, 
          socket.userId, 
          message, 
          finalMessageType, 
          attachments
        );

        const roomId = `ticket_${ticketId}`;
        
        // Diffuser le message à tous les participants du ticket
        const messageData = {
          ...ticketMessage,
          timestamp: new Date().toISOString()
        };

        if (finalMessageType === 'internal_note') {
          // Notes internes seulement aux agents
          this.io.to(roomId).emit('internal_message_received', messageData);
        } else {
          // Messages publics à tous
          this.io.to(roomId).emit('message_received', messageData);
        }

        // Si c'est un message client vers un agent non connecté, notifier
        if (finalMessageType === 'customer_message') {
          await this.notifyOfflineAgents(ticketId, ticketMessage);
        }

        // Confirmer l'envoi à l'expéditeur
        socket.emit('message_sent', {
          messageId: ticketMessage.id,
          timestamp: new Date().toISOString()
        });

        console.log(`Message envoyé dans ticket ${ticketId} par ${socket.userName}`);

      } catch (error) {
        console.error('Erreur send_message:', error);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });
  }

  /**
   * Gérer l'indicateur "en train d'écrire"
   */
  handleTypingStart(socket) {
    socket.on('typing_start', (data) => {
      const { ticketId } = data;
      const roomId = `ticket_${ticketId}`;
      
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        ticketId
      });
    });
  }

  handleTypingStop(socket) {
    socket.on('typing_stop', (data) => {
      const { ticketId } = data;
      const roomId = `ticket_${ticketId}`;
      
      socket.to(roomId).emit('user_stopped_typing', {
        userId: socket.userId,
        ticketId
      });
    });
  }

  /**
   * Gérer la déconnexion
   */
  handleDisconnection(socket) {
    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté: ${socket.userName} (${socket.userId})`);
      
      // Retirer des utilisateurs connectés
      this.connectedUsers.delete(socket.userId);
      
      // Si c'est un agent
      if (this.agentSockets.has(socket.userId)) {
        this.agentSockets.delete(socket.userId);
        
        // Notifier les autres agents
        socket.broadcast.to('agents').emit('agent_offline', {
          agentId: socket.userId,
          agentName: socket.userName,
          timestamp: new Date().toISOString()
        });
      }

      // Notifier si dans un ticket
      if (socket.currentTicket) {
        const roomId = `ticket_${socket.currentTicket}`;
        socket.to(roomId).emit('user_left_ticket', {
          userId: socket.userId,
          userName: socket.userName,
          ticketId: socket.currentTicket,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Obtenir les participants d'un ticket
   */
  async getTicketParticipants(roomId) {
    const sockets = await this.io.in(roomId).fetchSockets();
    return sockets.map(socket => ({
      userId: socket.userId,
      userName: socket.userName,
      role: socket.userRole
    }));
  }

  /**
   * Notifier les agents hors ligne
   */
  async notifyOfflineAgents(ticketId, message) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket || !ticket.agent) return;

      // Vérifier si l'agent assigné est en ligne
      if (!this.agentSockets.has(ticket.agent.id)) {
        // TODO: Envoyer notification push/email à l'agent hors ligne
        console.log(`Agent ${ticket.agent.id} hors ligne - notification à envoyer`);
      }
    } catch (error) {
      console.error('Erreur notification agents:', error);
    }
  }

  /**
   * Diffuser une notification à tous les agents en ligne
   */
  broadcastToAgents(event, data) {
    this.io.to('agents').emit(event, data);
  }

  /**
   * Envoyer notification à un ticket spécifique
   */
  notifyTicket(ticketId, event, data) {
    const roomId = `ticket_${ticketId}`;
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Obtenir les statistiques en temps réel
   */
  getRealtimeStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      onlineAgents: this.agentSockets.size,
      activeTickets: this.io.sockets.adapter.rooms.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ChatService;