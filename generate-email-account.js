const nodemailer = require('nodemailer');

async function createTestAccount() {
  try {
    // Créer un compte de test Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Compte email de test créé avec succès !');
    console.log('\n📧 Configuration email à utiliser :');
    console.log('MAIL_HOST=smtp.ethereal.email');
    console.log('MAIL_PORT=587');
    console.log('MAIL_SECURE=false');
    console.log(`MAIL_USER=${testAccount.user}`);
    console.log(`MAIL_PASS=${testAccount.pass}`);
    console.log('MAIL_FROM=noreply@afrikmode.com');
    console.log('MAIL_FROM_NAME=AfrikMode');
    console.log('MAIL_DEBUG=false');
    
    console.log('\n🔗 Interface web Ethereal :');
    console.log('https://ethereal.email/');
    console.log(`Utilisez ces identifiants pour voir les emails envoyés :`);
    console.log(`Email: ${testAccount.user}`);
    console.log(`Mot de passe: ${testAccount.pass}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte de test:', error);
  }
}

createTestAccount();
























































