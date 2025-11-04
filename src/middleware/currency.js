/**
 * Middleware de gestion des devises
 */

const supportedCurrencies = ['FCFA', 'EUR', 'USD'];
const defaultCurrency = 'FCFA';

// Taux de change (à remplacer par un service de taux de change en temps réel)
const exchangeRates = {
  FCFA: 1,
  EUR: 0.0015,
  USD: 0.0017
};

/**
 * Middleware pour détecter et configurer la devise
 */
const middleware = () => {
  return (req, res, next) => {
    // Détecter la devise depuis:
    // 1. Paramètre de requête 'currency'
    // 2. Cookie 'currency'
    // 3. Devise par défaut de l'utilisateur (si connecté)
    // 4. Devise par défaut

    let currency = defaultCurrency;

    // 1. Paramètre de requête
    if (req.query.currency && supportedCurrencies.includes(req.query.currency)) {
      currency = req.query.currency;
    }

    // 2. Cookie
    if (req.cookies && req.cookies.currency && supportedCurrencies.includes(req.cookies.currency)) {
      currency = req.cookies.currency;
    }

    // 3. Devise de l'utilisateur connecté
    if (req.user && req.user.preferredCurrency && supportedCurrencies.includes(req.user.preferredCurrency)) {
      currency = req.user.preferredCurrency;
    }

      // Ajouter la devise à la requête
    req.currency = currency;
    res.locals.currency = currency;

    // Définir le cookie de devise
    res.cookie('currency', currency, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production'
    });

      next();
    };
};

/**
 * Convertir un montant d'une devise à une autre
 */
const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;

  // Convertir vers FCFA puis vers la devise cible
  const amountInFCFA = amount / fromRate;
  const convertedAmount = amountInFCFA * toRate;

  return Math.round(convertedAmount * 100) / 100; // Arrondir à 2 décimales
};

/**
 * Formater un montant selon la devise
 */
const formatCurrency = (amount, currency = defaultCurrency) => {
  const formatters = {
    FCFA: (amount) => `${Math.round(amount).toLocaleString()} FCFA`,
    EUR: (amount) => `€${amount.toFixed(2)}`,
    USD: (amount) => `$${amount.toFixed(2)}`
  };

  const formatter = formatters[currency] || formatters[defaultCurrency];
  return formatter(amount);
};

/**
 * Middleware pour la conversion automatique des montants
 */
const autoConvert = () => {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      if (data && typeof data === 'object') {
        data = convertResponseCurrency(data, req.currency);
      }
      return originalJson.call(this, data);
      };

      next();
    };
};

/**
 * Convertir les montants dans une réponse
 */
const convertResponseCurrency = (data, targetCurrency) => {
  if (Array.isArray(data)) {
    return data.map(item => convertResponseCurrency(item, targetCurrency));
  }

  if (data && typeof data === 'object') {
    const converted = { ...data };

    // Champs de prix à convertir
    const priceFields = ['price', 'amount', 'total', 'subtotal', 'shipping_cost', 'tax_amount', 'discount_amount'];

    priceFields.forEach(field => {
      if (converted[field] && typeof converted[field] === 'number') {
        converted[field] = convertCurrency(converted[field], 'FCFA', targetCurrency);
        converted[`${field}_formatted`] = formatCurrency(converted[field], targetCurrency);
      }
    });

    // Convertir les objets imbriqués
    Object.keys(converted).forEach(key => {
      if (converted[key] && typeof converted[key] === 'object') {
        converted[key] = convertResponseCurrency(converted[key], targetCurrency);
      }
    });

    return converted;
  }

  return data;
};

/**
 * Obtenir les taux de change
 */
const getExchangeRates = () => {
  return exchangeRates;
};

/**
 * Mettre à jour les taux de change
 */
const updateExchangeRates = (newRates) => {
  Object.assign(exchangeRates, newRates);
};

/**
 * Middleware pour ajouter les helpers de devise
 */
const addCurrencyHelpers = () => {
  return (req, res, next) => {
    res.convertCurrency = (amount, fromCurrency = 'FCFA', toCurrency = req.currency) => 
      convertCurrency(amount, fromCurrency, toCurrency);
    
    res.formatCurrency = (amount, currency = req.currency) => 
      formatCurrency(amount, currency);
    
    res.locals.convertCurrency = res.convertCurrency;
    res.locals.formatCurrency = res.formatCurrency;

      next();
    };
};

module.exports = {
  middleware,
  convertCurrency,
  formatCurrency,
  autoConvert,
  getExchangeRates,
  updateExchangeRates,
  addCurrencyHelpers,
  supportedCurrencies,
  defaultCurrency
};