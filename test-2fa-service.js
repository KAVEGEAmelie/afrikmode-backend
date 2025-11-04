const db = require('./src/config/database');

async function testTwoFactorService() {
  console.log('🔍 Test du service TwoFactorAuthService...\n');
  
  try {
    const userId = 'f3987104-c375-49c4-b24b-6d59f2fefbe6'; // ID de vendor@test.com
    
    console.log('1️⃣ Test du service TwoFactorAuthService...');
    
    try {
      const TwoFactorAuthService = require('./src/services/twoFactorAuthService');
      const isEnabled = await TwoFactorAuthService.isEnabled(userId);
      console.log(`✅ 2FA activée: ${isEnabled}`);
    } catch (error) {
      console.log('❌ Erreur dans TwoFactorAuthService:', error.message);
      console.log('❌ Stack:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await db.destroy();
  }
}

testTwoFactorService().catch(console.error);