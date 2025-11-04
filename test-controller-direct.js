const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./src/config/database');

// Simuler le contrôleur d'authentification
async function testControllerDirect() {
  console.log('🔍 Test direct du contrôleur d\'authentification...\n');
  
  try {
    const email = 'vendor@test.com';
    const password = 'AfrikMode2024!';
    
    console.log('1️⃣ Recherche de l\'utilisateur...');
    const user = await db('users')
      .where({ email: email.toLowerCase() })
      .whereNull('deleted_at')
      .first();
    
    console.log(`🔍 Recherche utilisateur pour: ${email.toLowerCase()}`);
    console.log(`👤 Utilisateur trouvé:`, user ? 'Oui' : 'Non');
    
    if (!user) {
      console.log(`❌ Utilisateur non trouvé pour: ${email}`);
      throw new Error('Identifiants invalides');
    }
    
    console.log(`📊 Détails utilisateur:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Statut: ${user.status}`);
    console.log(`   - Password hash présent: ${user.password_hash ? 'Oui' : 'Non'}`);
    console.log(`   - Longueur hash: ${user.password_hash ? user.password_hash.length : 0}`);
    
    console.log('\n2️⃣ Vérification du mot de passe...');
    console.log(`🔐 Vérification du mot de passe...`);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`🔐 Mot de passe valide: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log(`❌ Mot de passe incorrect pour: ${email}`);
      throw new Error('Identifiants invalides');
    }
    
    console.log('\n3️⃣ Vérification du statut du compte...');
    if (user.status === 'pending') {
      console.log('⚠️ Compte en attente de vérification');
      const isDev = process.env.NODE_ENV === 'development' || process.env.SKIP_EMAIL_VERIFICATION === 'true';
      console.log(`Mode développement: ${isDev}`);
      
      if (!isDev) {
        throw new Error('Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception.');
      }
    }
    
    if (user.status === 'banned') {
      throw new Error('Votre compte a été suspendu. Contactez le support.');
    }
    
    if (user.status === 'suspended') {
      throw new Error('Votre compte est temporairement suspendu.');
    }
    
    console.log('\n4️⃣ Vérification de la 2FA...');
    try {
      const TwoFactorAuthService = require('./src/services/twoFactorAuthService');
      const twoFactorEnabled = await TwoFactorAuthService.isEnabled(user.id);
      console.log(`2FA activée: ${twoFactorEnabled}`);
      
      if (twoFactorEnabled) {
        console.log('⚠️ 2FA activée - code requis');
        throw new Error('Code de vérification requis');
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
    console.log('Le contrôleur devrait fonctionner...');
    
  } catch (error) {
    console.error('❌ Erreur dans le contrôleur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

testControllerDirect().catch(console.error);




