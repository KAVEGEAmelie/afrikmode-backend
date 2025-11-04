/**
 * Service Email Mock pour les tests
 * Version simplifiée pour éviter les erreurs de dépendances
 */

class MockEmailService {
  
  static async sendEmail({ to, subject, html, text }) {
    console.log(`📧 [MOCK] Email envoyé à: ${to}`);
    console.log(`📧 [MOCK] Sujet: ${subject}`);
    return Promise.resolve({
      accepted: [to],
      messageId: 'mock-' + Date.now()
    });
  }

}

module.exports = MockEmailService;