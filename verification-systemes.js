/**
 * Script de vérification complète de l'implémentation des systèmes
 * Vérifie et coche si tout est en place pour les 3 systèmes demandés
 */

const fs = require('fs').promises;
const path = require('path');

class SystemVerifier {
  
  constructor() {
    this.results = {
      referralSystem: { implemented: 0, total: 0, details: [] },
      multiLanguage: { implemented: 0, total: 0, details: [] },
      multiCurrency: { implemented: 0, total: 0, details: [] }
    };
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async checkFileContent(filePath, patterns) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return patterns.map(pattern => ({
        pattern,
        found: content.includes(pattern)
      }));
    } catch {
      return patterns.map(pattern => ({ pattern, found: false }));
    }
  }

  async verifyReferralSystem() {
    console.log('\n🔍 VÉRIFICATION DU SYSTÈME DE PARRAINAGE...\n');
    
    const checks = [
      // 1. Migration de base de données
      {
        name: 'Migration des tables de parrainage',
        file: 'migrations/20250927150000_015_create_referrals_system.js',
        patterns: ['referral_codes', 'referrals', 'referral_rewards']
      },
      
      // 2. Service de parrainage
      {
        name: 'Service de parrainage',
        file: 'src/services/referralService.js',
        patterns: ['generateReferralCode', 'validateReferralCode', 'applyReferralCode', 'calculateReward']
      },
      
      // 3. Contrôleur de parrainage
      {
        name: 'Contrôleur de parrainage',
        file: 'src/controllers/referralController.js',
        patterns: ['getOrCreateReferralCode', 'validateCode', 'getDashboard', 'getStatistics']
      },
      
      // 4. Routes de parrainage
      {
        name: 'Routes de parrainage',
        file: 'src/routes/referrals.js',
        patterns: ['/generate-code', '/validate-code', '/apply-code', '/dashboard']
      },
      
      // 5. Intégration dans les commandes
      {
        name: 'Intégration système de parrainage',
        file: 'src/controllers/orderController.js',
        patterns: ['referral_code', 'ReferralService']
      }
    ];

    for (const check of checks) {
      const filePath = path.join(__dirname, check.file);
      const fileExists = await this.checkFileExists(filePath);
      
      if (fileExists) {
        const contentChecks = await this.checkFileContent(filePath, check.patterns);
        const implementedPatterns = contentChecks.filter(c => c.found).length;
        const totalPatterns = contentChecks.length;
        
        this.results.referralSystem.implemented += implementedPatterns;
        this.results.referralSystem.total += totalPatterns;
        
        const status = implementedPatterns === totalPatterns ? '✅' : '⚠️';
        console.log(`${status} ${check.name}: ${implementedPatterns}/${totalPatterns} fonctionnalités`);
        
        this.results.referralSystem.details.push({
          name: check.name,
          status: implementedPatterns === totalPatterns ? 'COMPLET' : 'PARTIEL',
          score: `${implementedPatterns}/${totalPatterns}`,
          missing: contentChecks.filter(c => !c.found).map(c => c.pattern)
        });
      } else {
        this.results.referralSystem.total += check.patterns.length;
        console.log(`❌ ${check.name}: Fichier manquant`);
        
        this.results.referralSystem.details.push({
          name: check.name,
          status: 'MANQUANT',
          score: '0/' + check.patterns.length,
          missing: check.patterns
        });
      }
    }
  }

  async verifyMultiLanguageSystem() {
    console.log('\n🔍 VÉRIFICATION DU SYSTÈME MULTILINGUE...\n');
    
    const checks = [
      // 1. Middleware i18n
      {
        name: 'Middleware d\'internationalisation',
        file: 'src/middleware/i18n.js',
        patterns: ['detectLanguage', 'translate', 'middleware', 'loadTranslations']
      },
      
      // 2. Fichiers de traduction FR
      {
        name: 'Traductions françaises',
        file: 'src/locales/fr.json',
        patterns: ['common.welcome', 'auth.login', 'products.title', 'errors.server_error']
      },
      
      // 3. Fichiers de traduction EN
      {
        name: 'Traductions anglaises', 
        file: 'src/locales/en.json',
        patterns: ['common.welcome', 'auth.login', 'products.title', 'errors.server_error']
      },
      
      // 4. Routes i18n
      {
        name: 'Routes d\'internationalisation',
        file: 'src/routes/i18n.js',
        patterns: ['/translations', '/preferences/language', '/translate']
      },
      
      // 5. Intégration dans server.js
      {
        name: 'Intégration middleware i18n',
        file: 'src/server.js',
        patterns: ['i18nMiddleware', 'middleware()']
      }
    ];

    for (const check of checks) {
      const filePath = path.join(__dirname, check.file);
      const fileExists = await this.checkFileExists(filePath);
      
      if (fileExists) {
        const contentChecks = await this.checkFileContent(filePath, check.patterns);
        const implementedPatterns = contentChecks.filter(c => c.found).length;
        const totalPatterns = contentChecks.length;
        
        this.results.multiLanguage.implemented += implementedPatterns;
        this.results.multiLanguage.total += totalPatterns;
        
        const status = implementedPatterns === totalPatterns ? '✅' : '⚠️';
        console.log(`${status} ${check.name}: ${implementedPatterns}/${totalPatterns} fonctionnalités`);
        
        this.results.multiLanguage.details.push({
          name: check.name,
          status: implementedPatterns === totalPatterns ? 'COMPLET' : 'PARTIEL',
          score: `${implementedPatterns}/${totalPatterns}`,
          missing: contentChecks.filter(c => !c.found).map(c => c.pattern)
        });
      } else {
        this.results.multiLanguage.total += check.patterns.length;
        console.log(`❌ ${check.name}: Fichier manquant`);
        
        this.results.multiLanguage.details.push({
          name: check.name,
          status: 'MANQUANT',
          score: '0/' + check.patterns.length,
          missing: check.patterns
        });
      }
    }
  }

  async verifyMultiCurrencySystem() {
    console.log('\n🔍 VÉRIFICATION DU SYSTÈME MULTI-DEVISES...\n');
    
    const checks = [
      // 1. Migration des taux de change
      {
        name: 'Migration des taux de change',
        file: 'migrations/20250927150001_016_create_exchange_rates.js',
        patterns: ['exchange_rates', 'from_currency', 'to_currency', 'rate']
      },
      
      // 2. Service des devises
      {
        name: 'Service de gestion des devises',
        file: 'src/services/currencyService.js',
        patterns: ['getExchangeRate', 'convertAmount', 'formatCurrency', 'fetchRateFromAPI']
      },
      
      // 3. Middleware de conversion
      {
        name: 'Middleware de conversion automatique',
        file: 'src/middleware/currency.js',
        patterns: ['autoConvert', 'convertResponsePrices', 'convertProductPrices']
      },
      
      // 4. Routes des devises
      {
        name: 'Routes de gestion des devises',
        file: 'src/routes/currencies.js',
        patterns: ['/currencies', '/exchange-rates', '/convert', '/preferences/currency']
      },
      
      // 5. Intégration dans server.js
      {
        name: 'Intégration middleware currency',
        file: 'src/server.js',
        patterns: ['currencyMiddleware', 'autoConvert()']
      }
    ];

    for (const check of checks) {
      const filePath = path.join(__dirname, check.file);
      const fileExists = await this.checkFileExists(filePath);
      
      if (fileExists) {
        const contentChecks = await this.checkFileContent(filePath, check.patterns);
        const implementedPatterns = contentChecks.filter(c => c.found).length;
        const totalPatterns = contentChecks.length;
        
        this.results.multiCurrency.implemented += implementedPatterns;
        this.results.multiCurrency.total += totalPatterns;
        
        const status = implementedPatterns === totalPatterns ? '✅' : '⚠️';
        console.log(`${status} ${check.name}: ${implementedPatterns}/${totalPatterns} fonctionnalités`);
        
        this.results.multiCurrency.details.push({
          name: check.name,
          status: implementedPatterns === totalPatterns ? 'COMPLET' : 'PARTIEL',
          score: `${implementedPatterns}/${totalPatterns}`,
          missing: contentChecks.filter(c => !c.found).map(c => c.pattern)
        });
      } else {
        this.results.multiCurrency.total += check.patterns.length;
        console.log(`❌ ${check.name}: Fichier manquant`);
        
        this.results.multiCurrency.details.push({
          name: check.name,
          status: 'MANQUANT',
          score: '0/' + check.patterns.length,
          missing: check.patterns
        });
      }
    }
  }

  generateSummaryReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 RAPPORT DE VÉRIFICATION COMPLÈTE - AfrikMode');
    console.log('='.repeat(80));

    // Calcul des pourcentages
    const referralPercent = Math.round((this.results.referralSystem.implemented / this.results.referralSystem.total) * 100);
    const multiLangPercent = Math.round((this.results.multiLanguage.implemented / this.results.multiLanguage.total) * 100);  
    const multiCurrencyPercent = Math.round((this.results.multiCurrency.implemented / this.results.multiCurrency.total) * 100);

    console.log('\n🎯 RÉSULTATS PAR SYSTÈME:');
    console.log('─'.repeat(50));
    
    // Système de parrainage
    const referralStatus = referralPercent === 100 ? '✅ COMPLET' : referralPercent >= 80 ? '⚠️ PRESQUE' : '❌ INCOMPLET';
    console.log(`4. PROGRAMME DE PARRAINAGE: ${referralStatus} (${referralPercent}%)`);
    console.log(`   Implementation: ${this.results.referralSystem.implemented}/${this.results.referralSystem.total} fonctionnalités`);
    
    // Système multilingue
    const multiLangStatus = multiLangPercent === 100 ? '✅ COMPLET' : multiLangPercent >= 80 ? '⚠️ PRESQUE' : '❌ INCOMPLET';
    console.log(`5. MULTI-LANGUES COMPLET: ${multiLangStatus} (${multiLangPercent}%)`);
    console.log(`   Implementation: ${this.results.multiLanguage.implemented}/${this.results.multiLanguage.total} fonctionnalités`);
    
    // Système multi-devises
    const multiCurrencyStatus = multiCurrencyPercent === 100 ? '✅ COMPLET' : multiCurrencyPercent >= 80 ? '⚠️ PRESQUE' : '❌ INCOMPLET';
    console.log(`6. SYSTÈME MULTI-DEVISES: ${multiCurrencyStatus} (${multiCurrencyPercent}%)`);
    console.log(`   Implementation: ${this.results.multiCurrency.implemented}/${this.results.multiCurrency.total} fonctionnalités`);

    // Résumé global
    const totalImplemented = this.results.referralSystem.implemented + this.results.multiLanguage.implemented + this.results.multiCurrency.implemented;
    const totalFeatures = this.results.referralSystem.total + this.results.multiLanguage.total + this.results.multiCurrency.total;
    const globalPercent = Math.round((totalImplemented / totalFeatures) * 100);

    console.log('\n🏆 RÉSUMÉ GLOBAL:');
    console.log('─'.repeat(50));
    console.log(`Fonctionnalités implémentées: ${totalImplemented}/${totalFeatures} (${globalPercent}%)`);
    console.log(`Systèmes complets: ${[referralPercent, multiLangPercent, multiCurrencyPercent].filter(p => p === 100).length}/3`);
    
    // Status de déploiement
    console.log('\n🚀 STATUS DE DÉPLOIEMENT:');
    console.log('─'.repeat(50));
    
    if (globalPercent === 100) {
      console.log('✅ TOUS LES SYSTÈMES SONT OPÉRATIONNELS');
      console.log('🎉 AfrikMode est prêt pour la production avec:');
      console.log('   • Système de parrainage complet avec récompenses');
      console.log('   • Support multilingue automatique (FR/EN)');
      console.log('   • Conversion automatique des devises');
    } else if (globalPercent >= 80) {
      console.log('⚠️ SYSTÈMES PRESQUE COMPLETS - Quelques ajustements requis');
    } else {
      console.log('❌ DÉVELOPPEMENT EN COURS - Plus de travail requis');
    }

    return {
      referralSystem: { percent: referralPercent, status: referralStatus },
      multiLanguage: { percent: multiLangPercent, status: multiLangStatus },
      multiCurrency: { percent: multiCurrencyPercent, status: multiCurrencyStatus },
      global: { percent: globalPercent, implemented: totalImplemented, total: totalFeatures }
    };
  }

  async run() {
    console.log('🔍 DÉMARRAGE DE LA VÉRIFICATION COMPLÈTE DES SYSTÈMES AfrikMode');
    console.log('=' + '='.repeat(80));
    
    await this.verifyReferralSystem();
    await this.verifyMultiLanguageSystem(); 
    await this.verifyMultiCurrencySystem();
    
    return this.generateSummaryReport();
  }
}

// Point d'entrée principal
async function main() {
  const verifier = new SystemVerifier();
  const results = await verifier.run();
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ VÉRIFICATION TERMINÉE - Systèmes AfrikMode analysés');
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SystemVerifier, main };