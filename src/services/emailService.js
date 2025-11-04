const nodemailer = require('nodemailer');
const ticketEmailTemplates = require('./ticketEmailTemplates');
const db = require('../config/database');
require('dotenv').config();

/**
 * Configuration du transporteur email
 */
const createTransporter = () => {
  // Vérifier que les variables d'environnement sont présentes
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error('Configuration email manquante: MAIL_USER et MAIL_PASS requis');
  }

  // Configuration Gmail avec App Password
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS // App Password de Gmail (format: xxxx xxxx xxxx xxxx)
    },
    tls: {
      rejectUnauthorized: false
    },
    // Configuration supplémentaire pour Gmail
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    rateDelta: 20000,
    rateLimit: 5
  });

  return transporter;
};

/**
 * Templates d'emails
 */
const emailTemplates = {
  // Template de vérification d'email
  verification: (firstName, verificationUrl) => ({
    subject: 'Vérifiez votre compte AfrikMode 🌍',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">Mode Africaine Authentique</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName} ! 👋</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Bienvenue sur AfrikMode ! Nous sommes ravis de vous accueillir dans notre communauté passionnée de mode africaine.
          </p>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 30px;">
            Pour finaliser votre inscription et découvrir nos magnifiques collections, veuillez cliquer sur le bouton ci-dessous :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(139, 46, 46, 0.3);">
              ✨ Vérifier mon compte
            </a>
          </div>
          
          <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
            <a href="${verificationUrl}" style="color: #8B2E2E; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #F5E4D7; margin: 30px 0;">
          
          <p style="color: #6B6B6B; font-size: 12px; line-height: 1.4;">
            Ce lien de vérification expirera dans 24 heures. Si vous n'avez pas créé de compte sur AfrikMode, ignorez simplement cet email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6B6B6B; font-size: 12px;">
          <p>© 2024 AfrikMode - Célébrer la beauté africaine</p>
          <p>🌍 Lomé, Togo | 📧 contact@afrikmode.com</p>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Bienvenue sur AfrikMode !
      
      Pour vérifier votre compte, cliquez sur ce lien : ${verificationUrl}
      
      Ce lien expirera dans 24 heures.
      
      L'équipe AfrikMode
    `
  }),

  // Template de réinitialisation de mot de passe
  passwordReset: (firstName, resetUrl) => ({
    subject: 'Réinitialisez votre mot de passe AfrikMode 🔐',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">Mode Africaine Authentique</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName},</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Vous avez demandé la réinitialisation de votre mot de passe sur AfrikMode.
          </p>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 30px;">
            Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #8B2E2E 0%, #D9744F 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(139, 46, 46, 0.3);">
              🔐 Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #6B6B6B; font-size: 14px; line-height: 1.6;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}" style="color: #8B2E2E; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #F5E4D7; margin: 30px 0;">
          
          <p style="color: #D9744F; font-size: 14px; font-weight: bold;">
            ⚠️ Important : Ce lien expirera dans 1 heure pour votre sécurité.
          </p>
          
          <p style="color: #6B6B6B; font-size: 12px; line-height: 1.4;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6B6B6B; font-size: 12px;">
          <p>© 2024 AfrikMode - Votre sécurité est notre priorité</p>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Vous avez demandé la réinitialisation de votre mot de passe.
      
      Cliquez sur ce lien pour créer un nouveau mot de passe : ${resetUrl}
      
      Ce lien expirera dans 1 heure.
      
      L'équipe AfrikMode
    `
  }),

  // Template de confirmation de commande
  orderConfirmation: (firstName, orderNumber, orderTotal, orderItems) => ({
    subject: `Commande confirmée #${orderNumber} - AfrikMode 🛍️`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">Votre commande est confirmée !</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Merci ${firstName} ! 🎉</h2>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 20px;">
            Votre commande <strong>#${orderNumber}</strong> a été confirmée et sera traitée sous peu.
          </p>
          
          <div style="background: #F5E4D7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B2E2E; margin-top: 0;">Récapitulatif de votre commande</h3>
            ${orderItems.map(item => `
              <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #E0E0E0;">
                <span>${item.name} x${item.quantity}</span>
                <span style="font-weight: bold;">${item.price} FCFA</span>
              </div>
            `).join('')}
            <div style="display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 2px solid #8B2E2E; font-size: 18px; font-weight: bold; color: #8B2E2E;">
              <span>Total</span>
              <span>${orderTotal} FCFA</span>
            </div>
          </div>
          
          <p style="color: #3A3A3A; line-height: 1.6; margin-bottom: 30px;">
            Nous vous enverrons une notification dès que votre commande sera expédiée avec les informations de suivi.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6B6B6B; font-size: 12px;">
          <p>© 2024 AfrikMode - Merci de votre confiance</p>
        </div>
      </div>
    `,
    text: `
      Bonjour ${firstName},
      
      Votre commande #${orderNumber} a été confirmée !
      Total : ${orderTotal} FCFA
      
      Nous vous tiendrons informé(e) du suivi de votre commande.
      
      L'équipe AfrikMode
    `
  }),

  // === TEMPLATES TICKETS SUPPORT ===
  ...ticketEmailTemplates,

  // Template de newsletter
  newsletter: (firstName, subject, content) => ({
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFF9F6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B2E2E; font-size: 28px; margin: 0;">AfrikMode</h1>
          <p style="color: #6B8E23; font-size: 16px; margin: 5px 0;">Newsletter</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B2E2E; margin-bottom: 20px;">Bonjour ${firstName} ! 👋</h2>
          ${content}
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6B6B6B; font-size: 12px;">
          <p>© 2024 AfrikMode</p>
          <p><a href="#" style="color: #8B2E2E;">Se désabonner</a></p>
        </div>
      </div>
    `,
    text: `Bonjour ${firstName},\n\n${content}\n\nL'équipe AfrikMode`
  })
};

/**
 * Envoyer un email de vérification
 */
const sendVerificationEmail = async (email, token, firstName) => {
  try {
    console.log('\n📧 ===== ENVOI EMAIL DE VÉRIFICATION =====');
    console.log(`📨 Destinataire: ${email}`);
    console.log(`👤 Nom: ${firstName}`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...`);
    
    // Vérifier la configuration email
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error('Configuration email manquante: MAIL_USER et MAIL_PASS requis');
    }
    
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/verify-email?token=${token}`;
    
    console.log(`🔗 URL de vérification: ${verificationUrl}`);
    
    const template = emailTemplates.verification(firstName, verificationUrl);
    
    console.log(`📧 Configuration email:`);
    console.log(`   - From: ${process.env.MAIL_FROM_NAME || 'AfrikMode'} <${process.env.MAIL_FROM}>`);
    console.log(`   - To: ${email}`);
    console.log(`   - Subject: ${template.subject}`);
    
    // Vérifier la connexion avant d'envoyer
    console.log('🔌 Vérification de la connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée');
    
    const info = await transporter.sendMail({
      from: `${process.env.MAIL_FROM_NAME || 'AfrikMode'} <${process.env.MAIL_FROM}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
    
    console.log(`✅ Email de vérification envoyé avec succès !`);
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📊 Réponse serveur: ${info.response}`);
    console.log('==========================================\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ===== ERREUR ENVOI EMAIL DE VÉRIFICATION =====');
    console.error(`📧 Destinataire: ${email}`);
    console.error(`🚨 Type d'erreur: ${error.name}`);
    console.error(`💬 Message: ${error.message}`);
    
    if (error.code) {
      console.error(`🔢 Code d'erreur: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`📡 Réponse serveur: ${error.response}`);
    }
    
    console.error(`📚 Stack: ${error.stack}`);
    console.error('==========================================\n');
    
    // Ne pas faire échouer l'inscription si l'email échoue
    console.log('⚠️  L\'inscription continue malgré l\'échec de l\'envoi d\'email');
    return false;
  }
};

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
const sendPasswordResetEmail = async (email, token, firstName) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${token}`;
    const template = emailTemplates.passwordReset(firstName, resetUrl);
    
    if (process.env.NODE_ENV === 'development' && process.env.MAIL_DEBUG === 'true') {
      // En mode développement, afficher l'email dans la console
      console.log('\n📧 ===== EMAIL DE RÉINITIALISATION DE MOT DE PASSE =====');
      console.log(`📨 À: ${email}`);
      console.log(`📋 Sujet: ${template.subject}`);
      console.log(`🔗 URL de réinitialisation: ${resetUrl}`);
      console.log('📄 Contenu HTML:');
      console.log(template.html);
      console.log('================================================\n');
      
      return true;
    }
    
    await transporter.sendMail({
      from: `${process.env.MAIL_FROM_NAME || 'AfrikMode'} <${process.env.MAIL_FROM}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
    
    console.log(`✅ Email de réinitialisation envoyé à ${email}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erreur envoi email de réinitialisation:', error);
    throw error;
  }
};

/**
 * Envoyer un email de confirmation de commande
 */
const sendOrderConfirmationEmail = async (email, firstName, orderData) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.orderConfirmation(
      firstName,
      orderData.orderNumber,
      orderData.total,
      orderData.items
    );
    
    await transporter.sendMail({
      from: `${process.env.MAIL_FROM_NAME || 'AfrikMode'} <${process.env.MAIL_FROM}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
    
    console.log(`✅ Email de confirmation de commande envoyé à ${email}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erreur envoi email de confirmation:', error);
    throw error;
  }
};

/**
 * Envoyer une newsletter
 */
const sendNewsletterEmail = async (email, firstName, subject, content) => {
  try {
    const transporter = createTransporter();
    const template = emailTemplates.newsletter(firstName, subject, content);
    
    await transporter.sendMail({
      from: `${process.env.MAIL_FROM_NAME || 'AfrikMode'} <${process.env.MAIL_FROM}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
    
    console.log(`✅ Newsletter envoyée à ${email}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erreur envoi newsletter:', error);
    throw error;
  }
};

/**
 * Envoyer email de création de ticket
 */
const sendTicketCreatedNotification = async (user, ticket) => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates.ticketCreated(user.first_name, ticket);
    
    const mailOptions = {
      from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email ticket créé envoyé à ${user.email}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email ticket créé:', error);
    throw error;
  }
};

/**
 * Envoyer email d'assignation de ticket à l'agent
 */
const sendTicketAssignedNotification = async (agent, ticket) => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates.ticketAssigned(agent.first_name, ticket);
    
    const mailOptions = {
      from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
      to: agent.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email ticket assigné envoyé à ${agent.email}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email ticket assigné:', error);
    throw error;
  }
};

/**
 * Envoyer email de réponse agent au client
 */
const sendTicketResponseNotification = async (ticket, message) => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates.ticketResponse(ticket.customer.name.split(' ')[0], ticket, message);
    
    const mailOptions = {
      from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
      to: ticket.customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email réponse ticket envoyé à ${ticket.customer.email}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email réponse ticket:', error);
    throw error;
  }
};

/**
 * Envoyer email de message client à l'agent
 */
const sendTicketMessageNotification = async (ticket, message) => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates.ticketMessage(ticket.agent.name.split(' ')[0], ticket, message);
    
    const mailOptions = {
      from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
      to: ticket.agent.email, // Email de l'agent via une jointure
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email message ticket envoyé à l'agent`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email message ticket:', error);
    throw error;
  }
};

/**
 * Envoyer email de ticket résolu
 */
const sendTicketResolvedNotification = async (ticket) => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates.ticketResolved(ticket.customer.name.split(' ')[0], ticket);
    
    const mailOptions = {
      from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
      to: ticket.customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email ticket résolu envoyé à ${ticket.customer.email}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email ticket résolu:', error);
    throw error;
  }
};

/**
 * Envoyer email de ticket fermé
 */
const sendTicketClosedNotification = async (ticket) => {
  try {
    const transporter = createTransporter();
    
    const template = emailTemplates.ticketClosed(ticket.customer.name.split(' ')[0], ticket);
    
    const mailOptions = {
      from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
      to: ticket.customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email ticket fermé envoyé à ${ticket.customer.email}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi email ticket fermé:', error);
    throw error;
  }
};

/**
 * Envoyer email d'escalade aux managers
 */
const sendTicketEscalatedNotification = async (ticket, reason) => {
  try {
    const transporter = createTransporter();
    
    // Récupérer les emails des managers
    const managers = await db('users')
      .select('email', 'first_name')
      .whereIn('role', ['manager', 'admin', 'super_admin'])
      .where('status', 'active')
      .whereNull('deleted_at');

    if (managers.length === 0) return;

    const template = emailTemplates.ticketEscalated(ticket, reason);
    
    // Envoyer à tous les managers
    const promises = managers.map(manager => {
      const mailOptions = {
        from: `"Support AfrikMode" <${process.env.MAIL_FROM}>`,
        to: manager.email,
        subject: template.subject,
        html: template.html.replace('{{managerName}}', manager.first_name),
        text: template.text.replace('{{managerName}}', manager.first_name)
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(promises);
    console.log(`✅ Email escalade envoyé à ${managers.length} managers`);
  } catch (error) {
    console.error('❌ Erreur envoi email escalade:', error);
    throw error;
  }
};

/**
 * Test de la connexion email
 */
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Connexion email vérifiée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion email:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendNewsletterEmail,
  sendTicketCreatedNotification,
  sendTicketAssignedNotification,
  sendTicketResponseNotification,
  sendTicketMessageNotification,
  sendTicketResolvedNotification,
  sendTicketClosedNotification,
  sendTicketEscalatedNotification,
  testConnection
};