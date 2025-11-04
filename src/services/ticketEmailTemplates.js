/**
 * Templates d'emails pour les tickets de support
 */
const ticketEmailTemplates = {
  // Template de création de ticket
  ticketCreated: (firstName, ticket) => ({
    subject: `Ticket créé: ${ticket.ticketNumber} - ${ticket.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">🎫 Votre ticket a été créé</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Votre demande de support a été enregistrée avec succès. Notre équipe va traiter votre demande dans les plus brefs délais.
          </p>
          
          <div style="background: #F5E4D7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B2E2E; margin-top: 0;">📋 Détails de votre ticket</h3>
            <p style="margin: 5px 0;"><strong>Numéro:</strong> ${ticket.ticketNumber}</p>
            <p style="margin: 5px 0;"><strong>Sujet:</strong> ${ticket.subject}</p>
            <p style="margin: 5px 0;"><strong>Catégorie:</strong> ${ticket.category}</p>
            <p style="margin: 5px 0;"><strong>Priorité:</strong> ${ticket.priority}</p>
            <p style="margin: 5px 0;"><strong>Statut:</strong> ${ticket.status}</p>
          </div>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Vous pouvez suivre l'évolution de votre ticket et échanger avec notre équipe via votre espace client ou en répondant directement à cet email.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;">
              📋 Voir mon ticket
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #F5E4D7; margin: 30px 0;">
          
          <p style="color: #6B6B6B; font-size: 14px;">
            <strong>Temps de réponse estimé:</strong> 24-48 heures<br>
            <strong>Référence:</strong> ${ticket.ticketNumber}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6B6B6B; font-size: 12px;">
          <p>© 2024 AfrikMode Support - Nous sommes là pour vous aider</p>
          <p>📧 support@afrikmode.com | 📞 +228 XX XX XX XX</p>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Votre ticket de support a été créé avec succès.
      
      Numéro: ${ticket.ticketNumber}
      Sujet: ${ticket.subject}
      Statut: ${ticket.status}
      
      Vous pouvez suivre votre ticket sur: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}
      
      L'équipe Support AfrikMode
    `
  }),

  // Template d'assignation de ticket (pour les agents)
  ticketAssigned: (agentName, ticket) => ({
    subject: `Ticket assigné: ${ticket.ticketNumber} - ${ticket.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">👨‍💼 Nouveau ticket assigné</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${agentName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Un nouveau ticket vous a été assigné. Merci de traiter cette demande dans les délais impartis.
          </p>
          
          <div style="background: #F5E4D7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B2E2E; margin-top: 0;">📋 Détails du ticket</h3>
            <p style="margin: 5px 0;"><strong>Numéro:</strong> ${ticket.ticketNumber}</p>
            <p style="margin: 5px 0;"><strong>Client:</strong> ${ticket.customer.name}</p>
            <p style="margin: 5px 0;"><strong>Sujet:</strong> ${ticket.subject}</p>
            <p style="margin: 5px 0;"><strong>Catégorie:</strong> ${ticket.category}</p>
            <p style="margin: 5px 0;"><strong>Priorité:</strong> <span style="color: ${ticket.priority === 'urgent' ? '#dc3545' : ticket.priority === 'high' ? '#fd7e14' : '#28a745'};">${ticket.priority}</span></p>
            <p style="margin: 5px 0;"><strong>Créé le:</strong> ${new Date(ticket.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;">
              🎯 Traiter le ticket
            </a>
          </div>
        </div>
      </div>
    `,
    text: `
      Bonjour ${agentName},
      
      Un nouveau ticket vous a été assigné:
      
      Numéro: ${ticket.ticketNumber}
      Client: ${ticket.customer.name}
      Sujet: ${ticket.subject}
      Priorité: ${ticket.priority}
      
      Traitez le ticket: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}
      
      L'équipe Support AfrikMode
    `
  }),

  // Template de réponse agent (pour le client)
  ticketResponse: (firstName, ticket, message) => ({
    subject: `Réponse à votre ticket ${ticket.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">💬 Nouvelle réponse</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Notre équipe a répondu à votre ticket <strong>${ticket.ticketNumber}</strong>:
          </p>
          
          <div style="background: #F0F8FF; padding: 20px; border-left: 4px solid #8B2E2E; margin: 20px 0;">
            <p style="color: #3A3A3A; line-height: 1.6; margin: 0;">
              ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;">
              💬 Voir la réponse complète
            </a>
          </div>
          
          <p style="color: #6B6B6B; font-size: 14px;">
            Vous pouvez répondre directement à cet email ou via votre espace client.
          </p>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Notre équipe a répondu à votre ticket ${ticket.ticketNumber}.
      
      Voir la réponse: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}
      
      L'équipe Support AfrikMode
    `
  }),

  // Template de message client (pour l'agent)
  ticketMessage: (agentName, ticket, message) => ({
    subject: `Nouveau message sur le ticket ${ticket.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">💬 Nouveau message client</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${agentName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Le client a ajouté un message au ticket <strong>${ticket.ticketNumber}</strong>:
          </p>
          
          <div style="background: #FFF8DC; padding: 20px; border-left: 4px solid #D9744F; margin: 20px 0;">
            <p style="color: #3A3A3A; line-height: 1.6; margin: 0;">
              ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;">
              💬 Répondre au client
            </a>
          </div>
        </div>
      </div>
    `,
    text: `
      Bonjour ${agentName},
      
      Nouveau message client sur le ticket ${ticket.ticketNumber}.
      
      Répondre: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}
      
      L'équipe Support AfrikMode
    `
  }),

  // Template de ticket résolu
  ticketResolved: (firstName, ticket) => ({
    subject: `Ticket résolu: ${ticket.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">✅ Ticket résolu</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Bonne nouvelle ! Votre ticket <strong>${ticket.ticketNumber}</strong> a été résolu par notre équipe.
          </p>
          
          <div style="background: #D4EDDA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #155724; margin-top: 0;">🎉 Problème résolu</h3>
            <p style="color: #155724; margin: 5px 0;"><strong>Sujet:</strong> ${ticket.subject}</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Résolu le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          </div>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Nous espérons que la solution apportée répond à vos attentes. Votre satisfaction est notre priorité !
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}/satisfaction" 
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;
                      margin-right: 10px;">
              ⭐ Évaluer le support
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #F5E4D7; margin: 30px 0;">
          
          <p style="color: #6B6B6B; font-size: 14px;">
            Si le problème persiste ou si vous avez d'autres questions, n'hésitez pas à rouvrir ce ticket ou à en créer un nouveau.
          </p>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Votre ticket ${ticket.ticketNumber} a été résolu.
      
      Évaluez notre support: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/tickets/${ticket.id}/satisfaction
      
      L'équipe Support AfrikMode
    `
  }),

  // Template de ticket fermé
  ticketClosed: (firstName, ticket) => ({
    subject: `Ticket fermé: ${ticket.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">🔒 Ticket fermé</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Votre ticket <strong>${ticket.ticketNumber}</strong> a été fermé.
          </p>
          
          <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #6C757D; margin-top: 0;">📋 Résumé</h3>
            <p style="margin: 5px 0;"><strong>Sujet:</strong> ${ticket.subject}</p>
            <p style="margin: 5px 0;"><strong>Créé le:</strong> ${new Date(ticket.createdAt).toLocaleString('fr-FR')}</p>
            <p style="margin: 5px 0;"><strong>Fermé le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          </div>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Merci d'avoir utilisé notre service de support. Nous restons à votre disposition pour toute nouvelle demande.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/create" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;">
              ➕ Créer un nouveau ticket
            </a>
          </div>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Votre ticket ${ticket.ticketNumber} a été fermé.
      
      Pour une nouvelle demande: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/support/create
      
      L'équipe Support AfrikMode
    `
  }),

  // Template d'escalade (pour les managers)
  ticketEscalated: (ticket, reason) => ({
    subject: `🚨 ESCALADE: Ticket ${ticket.ticketNumber} - ${ticket.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode Support</h1>
          <p style="color: #dc3545; font-size: 16px; margin: 5px 0; font-weight: bold;">🚨 TICKET ESCALADÉ</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc3545; margin-bottom: 20px;">Bonjour {{managerName}} ! ⚠️</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Un ticket nécessite votre attention immédiate. Il a été escaladé par l'équipe support.
          </p>
          
          <div style="background: #F8D7DA; border: 2px solid #dc3545; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #721c24; margin-top: 0;">📋 Détails du ticket escaladé</h3>
            <p style="margin: 5px 0;"><strong>Numéro:</strong> ${ticket.ticketNumber}</p>
            <p style="margin: 5px 0;"><strong>Client:</strong> ${ticket.customer.name}</p>
            <p style="margin: 5px 0;"><strong>Sujet:</strong> ${ticket.subject}</p>
            <p style="margin: 5px 0;"><strong>Priorité:</strong> <span style="color: #dc3545; font-weight: bold;">${ticket.priority}</span></p>
            <p style="margin: 5px 0;"><strong>Niveau escalade:</strong> ${ticket.escalationLevel}</p>
            <p style="margin: 5px 0;"><strong>Créé le:</strong> ${new Date(ticket.createdAt).toLocaleString('fr-FR')}</p>
            ${reason ? `<p style="margin: 10px 0;"><strong>Raison escalade:</strong><br><em>"${reason}"</em></p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}" 
               style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;">
              🚨 TRAITER IMMÉDIATEMENT
            </a>
          </div>
          
          <p style="color: #721c24; font-weight: bold; text-align: center;">
            Action requise dans les plus brefs délais
          </p>
        </div>
      </div>
    `,
    text: `
      TICKET ESCALADÉ - {{managerName}}
      
      Numéro: ${ticket.ticketNumber}
      Client: ${ticket.customer.name}
      Sujet: ${ticket.subject}
      Priorité: ${ticket.priority}
      Niveau: ${ticket.escalationLevel}
      ${reason ? `Raison: ${reason}` : ''}
      
      Traiter: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}
      
      URGENT - Support AfrikMode
    `
  })
};

module.exports = ticketEmailTemplates;