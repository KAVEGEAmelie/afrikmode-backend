const bcrypt = require('bcrypt');
const db = require('./src/config/database');

async function testSimpleLogin() {
  console.log('🔍 Test simple de la logique de login...\n');
  
  try {
    const email = 'vendor@test.com';
    const password = 'AfrikMode2024!';
    
    console.log('1️⃣ Recherche de l\'utilisateur...');
    const user = await db('users')
      .where({ email: email.toLowerCase() })
      .whereNull('deleted_at')
      .first();
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('✅ Utilisateur trouvé');
    
    console.log('\n2️⃣ Vérification du mot de passe...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`Mot de passe valide: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('❌ Mot de passe incorrect');
      return;
    }
    
    console.log('\n3️⃣ Vérification du statut...');
    console.log(`Statut: ${user.status}`);
    
    if (user.status === 'pending') {
      console.log('⚠️ Compte en attente - vérification du mode développement');
      const isDev = process.env.NODE_ENV === 'development' || process.env.SKIP_EMAIL_VERIFICATION === 'true';
      console.log(`Mode développement: ${isDev}`);
      
      if (!isDev) {
        console.log('❌ Connexion refusée - email non vérifié');
        return;
      }
    }
    
    if (user.status === 'banned') {
      console.log('❌ Compte banni');
      return;
    }
    
    if (user.status === 'suspended') {
      console.log('❌ Compte suspendu');
      return;
    }
    
    console.log('\n4️⃣ Test de la 2FA...');
    try {
      const TwoFactorAuthService = require('./src/services/twoFactorAuthService');
      const twoFactorEnabled = await TwoFactorAuthService.isEnabled(user.id);
      console.log(`2FA activée: ${twoFactorEnabled}`);
      
      if (twoFactorEnabled) {
        console.log('⚠️ 2FA activée - code requis');
        console.log('❌ Connexion refusée - code 2FA requis');
        return;
      }
    } catch (error) {
      console.log('⚠️ Erreur lors de la vérification 2FA:', error.message);
      // Continuer sans 2FA en cas d'erreur
    }
    
    console.log('\n5️⃣ Génération des tokens...');
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        tenantId: user.tenant_id,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );
    
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    console.log('✅ Tokens générés');
    
    console.log('\n6️⃣ Mise à jour des informations de connexion...');
    await db('users')
      .where({ id: user.id })
      .update({
        last_login: db.fn.now(),
        last_login_ip: '127.0.0.1'
      });
    
    console.log('✅ Informations de connexion mises à jour');
    
    console.log('\n✅ Connexion réussie !');
    console.log('Le problème doit être ailleurs dans le code...');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

testSimpleLogin().catch(console.error);




