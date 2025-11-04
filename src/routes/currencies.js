/**
 * Routes pour la gestion des devises
 */

const express = require('express');
const router = express.Router();
const CurrencyService = require('../services/currencyService');
const { requireAuth: auth } = require('../middleware/auth');

// Obtenir toutes les devises supportées
router.get('/currencies', async (req, res) => {
  try {
    const currencies = CurrencyService.getSupportedCurrencies();
    
    res.json({
      success: true,
      data: {
        currencies,
        default_currency: 'FCFA'
      }
    });
  } catch (error) {
    console.error('Erreur obtention devises:', error);
    res.status(500).json({
      success: false,
      message: req.__('server.error')
    });
  }
});

// Obtenir les taux de change actuels
router.get('/exchange-rates', async (req, res) => {
  try {
    const { from = 'FCFA', to } = req.query;
    
    if (to) {
      // Taux spécifique
      const rate = await CurrencyService.getExchangeRate(from, to);
      
      res.json({
        success: true,
        data: {
          from,
          to,
          rate,
          timestamp: new Date(),
          valid_for: '1 hour'
        }
      });
    } else {
      // Tous les taux depuis FCFA
      const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'XAF'];
      const rates = {};
      
      for (const currency of currencies) {
        if (currency !== from) {
          rates[currency] = await CurrencyService.getExchangeRate(from, currency);
        }
      }
      
      res.json({
        success: true,
        data: {
          base_currency: from,
          rates,
          timestamp: new Date(),
          valid_for: '1 hour'
        }
      });
    }
  } catch (error) {
    console.error('Erreur obtention taux:', error);
    res.status(500).json({
      success: false,
      message: req.__('currency.rate_error')
    });
  }
});

// Convertir un montant
router.post('/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.body;
    
    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: req.__('validation.required_fields')
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: req.__('validation.invalid_amount')
      });
    }

    const convertedAmount = await CurrencyService.convertAmount(amount, from, to);
    const rate = await CurrencyService.getExchangeRate(from, to);
    
    res.json({
      success: true,
      data: {
        original: {
          amount: parseFloat(amount),
          currency: from
        },
        converted: {
          amount: convertedAmount,
          currency: to
        },
        exchange_rate: rate,
        formatted: {
          original: CurrencyService.formatCurrency(amount, from),
          converted: CurrencyService.formatCurrency(convertedAmount, to)
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Erreur conversion:', error);
    res.status(500).json({
      success: false,
      message: req.__('currency.conversion_error')
    });
  }
});

// Définir la devise préférée de l'utilisateur
router.put('/preferences/currency', auth, async (req, res) => {
  try {
    const { currency } = req.body;
    const userId = req.user.id;

    // Vérifier que la devise est supportée
    const supportedCurrencies = CurrencyService.getSupportedCurrencies();
    const currencyCodes = supportedCurrencies.map(c => c.code);
    
    if (!currencyCodes.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: req.__('validation.invalid_currency')
      });
    }

    // Mettre à jour la préférence dans la base de données
    const db = require('../config/database');
    await db('users')
      .where('id', userId)
      .update({ 
        preferred_currency: currency,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: req.__('currency.preference_updated'),
      data: { 
        preferred_currency: currency,
        rate_from_fcfa: await CurrencyService.getExchangeRate('FCFA', currency)
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour devise:', error);
    res.status(500).json({
      success: false,
      message: req.__('server.error')
    });
  }
});

// Obtenir les préférences de devise de l'utilisateur
router.get('/preferences/currency', auth, async (req, res) => {
  try {
    const db = require('../config/database');
    const user = await db('users')
      .select('preferred_currency')
      .where('id', req.user.id)
      .first();

    const preferredCurrency = user?.preferred_currency || 'FCFA';
    const rate = preferredCurrency !== 'FCFA' 
      ? await CurrencyService.getExchangeRate('FCFA', preferredCurrency)
      : 1;

    res.json({
      success: true,
      data: {
        preferred_currency: preferredCurrency,
        exchange_rate_from_fcfa: rate,
        supported_currencies: CurrencyService.getSupportedCurrencies()
      }
    });
  } catch (error) {
    console.error('Erreur obtention préférences devise:', error);
    res.status(500).json({
      success: false,
      message: req.__('server.error')
    });
  }
});

// Obtenir l'historique des taux pour une paire de devises
router.get('/history/:from/:to', async (req, res) => {
  try {
    const { from, to } = req.params;
    const { days = 7 } = req.query;
    
    const db = require('../config/database');
    const history = await db('exchange_rates')
      .select('rate', 'updated_at')
      .where({ from_currency: from, to_currency: to })
      .where('updated_at', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
      .orderBy('updated_at', 'desc')
      .limit(100);

    res.json({
      success: true,
      data: {
        from,
        to,
        period: `${days} days`,
        history: history.map(h => ({
          rate: h.rate,
          date: h.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Erreur historique taux:', error);
    res.status(500).json({
      success: false,
      message: req.__('server.error')
    });
  }
});

// Statistiques des devises utilisées
router.get('/statistics', auth, async (req, res) => {
  try {
    const stats = await CurrencyService.getCurrencyStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur statistiques devises:', error);
    res.status(500).json({
      success: false,
      message: req.__('server.error')
    });
  }
});

// Rafraîchir les taux de change
router.post('/refresh-rates', async (req, res) => {
  try {
    const { currencies } = req.body;
    const baseCurrency = 'FCFA';
    
    const currenciesToRefresh = currencies || ['USD', 'EUR', 'GBP', 'CAD', 'XAF'];
    const refreshedRates = {};
    
    for (const currency of currenciesToRefresh) {
      if (currency !== baseCurrency) {
        try {
          const rate = await CurrencyService.fetchRateFromAPI(baseCurrency, currency);
          if (rate) {
            await CurrencyService.cacheRate(baseCurrency, currency, rate);
            refreshedRates[currency] = rate;
          }
        } catch (error) {
          console.error(`Erreur rafraîchissement ${currency}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      message: req.__('currency.rates_refreshed'),
      data: {
        base_currency: baseCurrency,
        refreshed_rates: refreshedRates,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Erreur rafraîchissement taux:', error);
    res.status(500).json({
      success: false,
      message: req.__('server.error')
    });
  }
});

module.exports = router;