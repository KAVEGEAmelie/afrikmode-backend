const bcrypt = require('bcrypt');
const db = require('./src/config/database');

async function testControllerLogic() {
  console.log('🔍 Test de la logique du contrôleur d\'authentification...\n');
  
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
    
    console.log('✅ Utilisateur trouvé:', {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role
    });
    
    console.log('\n2️⃣ Vérification du mot de passe...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`Mot de passe valide: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('❌ Échec de la vérification du mot de passe');
      return;
    }
    
    console.log('\n3️⃣ Vérification du statut du compte...');
    console.log(`Statut: ${user.status}`);
    
    if (user.status === 'pending') {
      console.log('⚠️ Compte en attente de vérification');
      const isDev = process.env.NODE_ENV === 'development' || process.env.SKIP_EMAIL_VERIFICATION === 'true';
      console.log(`Mode développement: ${isDev}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`SKIP_EMAIL_VERIFICATION: ${process.env.SKIP_EMAIL_VERIFICATION}`);
      
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
    
    console.log('\n4️⃣ Vérification de la 2FA...');
    // Simuler la vérification 2FA
    const TwoFactorAuthService = require('./src/services/twoFactorAuthService');
    let twoFactorEnabled = false;
    
    try {
      twoFactorEnabled = await TwoFactorAuthService.isEnabled(user.id);
      console.log(`2FA activée: ${twoFactorEnabled}`);
    } catch (error) {
      console.log('⚠️ Erreur lors de la vérification 2FA:', error.message);
      // Continuer sans 2FA en cas d'erreur
    }
    
    if (twoFactorEnabled) {
      console.log('⚠️ 2FA activée - code requis');
      // Pour ce test, on simule qu'on n'a pas de code OTP
      console.log('❌ Connexion refusée - code 2FA requis');
      return;
    }
    
    console.log('\n5️⃣ Génération des tokens...');
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    
    const generateToken = (userId, role, tenantId = null) => {
      const payload = {
        userId,
        role,
        tenantId,
        iat: Math.floor(Date.now() / 1000)
      };
      
      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      });
    };
    
    const generateRefreshToken = () => {
      return crypto.randomBytes(40).toString('hex');
    };
    
    const token = generateToken(user.id, user.role, user.tenant_id);
    const refreshToken = generateRefreshToken();
    
    console.log('✅ Tokens générés');
    console.log(`Token (premiers 50 chars): ${token.substring(0, 50)}...`);
    console.log(`Refresh token: ${refreshToken.substring(0, 20)}...`);
    
    console.log('\n6️⃣ Mise à jour des informations de connexion...');
    await db('users')
      .where({ id: user.id })
      .update({
        last_login: db.fn.now(),
        last_login_ip: '127.0.0.1'
      });
    
    console.log('✅ Informations de connexion mises à jour');
    
    console.log('\n✅ Test de la logique du contrôleur réussi !');
    console.log('La connexion devrait fonctionner...');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await db.destroy();
  }
}

testControllerLogic().catch(console.error);
