/**
 * Service de conversion de devises
 * Gère les taux de change et la conversion automatique
 */

const db = require('../config/database');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CurrencyService {

  constructor() {
    this.supportedCurrencies = ['FCFA', 'EUR', 'USD'];
    this.baseCurrency = 'FCFA';
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
    this.apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.fixer.io/latest';
    this.cacheMinutes = 60; // Cache pendant 1 heure
  }

  /**
   * Obtenir le taux de change entre deux devises
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    try {
      // Si même devise, taux = 1
      if (fromCurrency === toCurrency) {
        return 1;
      }

      // Chercher dans le cache
      const cachedRate = await this.getCachedRate(fromCurrency, toCurrency);
      if (cachedRate) {
        return cachedRate.rate;
      }

      // Récupérer depuis l'API
      const rate = await this.fetchRateFromAPI(fromCurrency, toCurrency);
      
      // Mettre en cache
      await this.cacheRate(fromCurrency, toCurrency, rate);
      
      return rate;

    } catch (error) {
      console.error('Erreur récupération taux de change:', error);
      
      // Fallback vers les taux par défaut
      return this.getDefaultRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Récupérer le taux depuis le cache
   */
  async getCachedRate(fromCurrency, toCurrency) {
    try {
      const cached = await db('exchange_rates')
        .where({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          is_active: true
        })
        .where('expires_at', '>', new Date())
        .orderBy('fetched_at', 'desc')
        .first();

      return cached;
    } catch (error) {
      console.error('Erreur cache taux de change:', error);
      return null;
    }
  }

  /**
   * Récupérer le taux depuis l'API externe
   */
  async fetchRateFromAPI(fromCurrency, toCurrency) {
    try {
      // Configuration pour différentes APIs
      const apiConfigs = {
        'fixer.io': {
          url: `https://api.fixer.io/latest?access_key=${this.apiKey}`,
          parseRate: (data, from, to) => {
            if (data.base !== 'EUR') {
              throw new Error('API Fixer.io utilise EUR comme base');
            }
            const fromRate = from === 'EUR' ? 1 : data.rates[from];
            const toRate = to === 'EUR' ? 1 : data.rates[to];
            return toRate / fromRate;
          }
        },
        'exchangerate-api': {
          url: `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
          parseRate: (data, from, to) => data.rates[to]
        },
        'free': {
          // API gratuite de fallback
          url: `https://api.exchangerate.host/latest?base=${fromCurrency}&symbols=${toCurrency}`,
          parseRate: (data, from, to) => data.rates[to]
        }
      };

      // Essayer avec l'API configurée ou gratuite
      const config = this.apiKey ? apiConfigs['fixer.io'] : apiConfigs['free'];
      
      const response = await axios.get(config.url, { timeout: 5000 });
      
      if (response.data.success === false) {
        throw new Error(response.data.error?.info || 'Erreur API taux de change');
      }

      const rate = config.parseRate(response.data, fromCurrency, toCurrency);
      
      if (!rate || isNaN(rate) || rate <= 0) {
        throw new Error('Taux de change invalide reçu');
      }

      return rate;

    } catch (error) {
      console.error('Erreur API taux de change:', error);
      throw error;
    }
  }

  /**
   * Mettre en cache un taux de change
   */
  async cacheRate(fromCurrency, toCurrency, rate) {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheMinutes);

      const exchangeRate = {
        id: uuidv4(),
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        inverse_rate: 1 / rate,
        source: this.apiKey ? 'fixer.io' : 'exchangerate.host',
        fetched_at: new Date(),
        expires_at: expiresAt,
        is_active: true,
        metadata: JSON.stringify({
          cache_duration: this.cacheMinutes,
          api_used: this.apiKey ? 'paid' : 'free'
        })
      };

      // Désactiver les anciens taux pour cette paire
      await db('exchange_rates')
        .where({
          from_currency: fromCurrency,
          to_currency: toCurrency
        })
        .update({ is_active: false });

      // Insérer le nouveau taux
      await db('exchange_rates').insert(exchangeRate);

      console.log(`✅ Taux de change mis en cache: ${fromCurrency} -> ${toCurrency} = ${rate}`);

    } catch (error) {
      console.error('Erreur mise en cache taux:', error);
    }
  }

  /**
   * Taux par défaut (approximatifs)
   */
  getDefaultRate(fromCurrency, toCurrency) {
    const defaultRates = {
      'FCFA_EUR': 0.00152, // 1 FCFA ≈ 0.00152 EUR
      'FCFA_USD': 0.00161, // 1 FCFA ≈ 0.00161 USD  
      'EUR_FCFA': 655,     // 1 EUR ≈ 655 FCFA
      'EUR_USD': 1.06,     // 1 EUR ≈ 1.06 USD
      'USD_FCFA': 620,     // 1 USD ≈ 620 FCFA
      'USD_EUR': 0.94      // 1 USD ≈ 0.94 EUR
    };

    const key = `${fromCurrency}_${toCurrency}`;
    const rate = defaultRates[key];

    if (rate) {
      console.warn(`⚠️ Utilisation taux par défaut: ${fromCurrency} -> ${toCurrency} = ${rate}`);
      return rate;
    }

    console.warn(`⚠️ Taux non trouvé, utilisation 1:1 pour ${fromCurrency} -> ${toCurrency}`);
    return 1;
  }

  /**
   * Convertir un montant d'une devise à une autre
   */
  async convertAmount(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return parseFloat(amount);
      }

      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = parseFloat(amount) * rate;

      return Math.round(convertedAmount * 100) / 100; // Arrondir à 2 décimales
    } catch (error) {
      console.error('Erreur conversion montant:', error);
      return parseFloat(amount); // Retourner le montant original en cas d'erreur
    }
  }

  /**
   * Convertir plusieurs montants
   */
  async convertMultipleAmounts(items, fromCurrency, toCurrency) {
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      
      return items.map(item => ({
        ...item,
        originalAmount: item.amount,
        originalCurrency: fromCurrency,
        convertedAmount: Math.round(item.amount * rate * 100) / 100,
        convertedCurrency: toCurrency,
        exchangeRate: rate
      }));
    } catch (error) {
      console.error('Erreur conversion multiple:', error);
      return items;
    }
  }

  /**
   * Obtenir tous les taux de change disponibles
   */
  async getAllRates(baseCurrency = 'FCFA') {
    try {
      const rates = {};
      
      for (const currency of this.supportedCurrencies) {
        if (currency !== baseCurrency) {
          rates[currency] = await this.getExchangeRate(baseCurrency, currency);
        }
      }

      return {
        base: baseCurrency,
        rates,
        lastUpdated: new Date().toISOString(),
        supported: this.supportedCurrencies
      };
    } catch (error) {
      console.error('Erreur récupération tous les taux:', error);
      return {
        base: baseCurrency,
        rates: {},
        error: error.message
      };
    }
  }

  /**
   * Formater un montant selon la devise et la locale
   */
  formatAmount(amount, currency, locale = 'fr-FR') {
    try {
      const options = {
        style: 'currency',
        currency: currency === 'FCFA' ? 'XOF' : currency,
        minimumFractionDigits: currency === 'FCFA' ? 0 : 2,
        maximumFractionDigits: currency === 'FCFA' ? 0 : 2
      };

      // Pour FCFA, utiliser un format personnalisé
      if (currency === 'FCFA') {
        const formatter = new Intl.NumberFormat(locale);
        return `${formatter.format(amount)} FCFA`;
      }

      return new Intl.NumberFormat(locale, options).format(amount);
    } catch (error) {
      console.error('Erreur formatage montant:', error);
      return `${amount} ${currency}`;
    }
  }

  /**
   * Nettoyer le cache expiré
   */
  async cleanExpiredRates() {
    try {
      const deleted = await db('exchange_rates')
        .where('expires_at', '<', new Date())
        .del();

      if (deleted > 0) {
        console.log(`🧹 ${deleted} taux de change expirés supprimés`);
      }
    } catch (error) {
      console.error('Erreur nettoyage cache:', error);
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  async getCacheStats() {
    try {
      const [total, active, expired] = await Promise.all([
        db('exchange_rates').count('* as count').first(),
        db('exchange_rates').where('expires_at', '>', new Date()).count('* as count').first(),
        db('exchange_rates').where('expires_at', '<=', new Date()).count('* as count').first()
      ]);

      return {
        total: parseInt(total.count),
        active: parseInt(active.count),
        expired: parseInt(expired.count),
        cacheMinutes: this.cacheMinutes
      };
    } catch (error) {
      console.error('Erreur stats cache:', error);
      return { error: error.message };
    }
  }

}

module.exports = new CurrencyService();