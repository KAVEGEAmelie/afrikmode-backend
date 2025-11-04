/**
 * Middleware d'internationalisation
 */

const supportedLanguages = ['fr', 'en'];
const defaultLanguage = 'fr';

/**
 * Middleware pour détecter et configurer la langue
 */
const middleware = () => {
  return (req, res, next) => {
    // Détecter la langue depuis:
    // 1. Header Accept-Language
    // 2. Paramètre de requête 'lang'
    // 3. Cookie 'language'
    // 4. Langue par défaut de l'utilisateur (si connecté)
    // 5. Langue par défaut

    let language = defaultLanguage;

    // 1. Header Accept-Language
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const preferredLang = acceptLanguage.split(',')[0].split('-')[0];
      if (supportedLanguages.includes(preferredLang)) {
        language = preferredLang;
      }
    }

    // 2. Paramètre de requête
    if (req.query.lang && supportedLanguages.includes(req.query.lang)) {
      language = req.query.lang;
    }

    // 3. Cookie
    if (req.cookies && req.cookies.language && supportedLanguages.includes(req.cookies.language)) {
      language = req.cookies.language;
    }

    // 4. Langue de l'utilisateur connecté
    if (req.user && req.user.preferredLanguage && supportedLanguages.includes(req.user.preferredLanguage)) {
      language = req.user.preferredLanguage;
    }

    // Ajouter la langue à la requête
    req.language = language;
    res.locals.language = language;

    // Définir le cookie de langue
    res.cookie('language', language, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production'
    });

    next();
  };
};

/**
 * Fonction pour traduire un texte
 */
const translate = (key, language = defaultLanguage, params = {}) => {
  try {
    const translations = require(`../locales/${language}.json`);
    let text = translations[key] || key;

    // Remplacer les paramètres
      Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
      
      return text;
    } catch (error) {
    console.error(`Erreur de traduction pour la clé "${key}" en ${language}:`, error);
      return key;
    }
};

/**
 * Helper pour les réponses localisées
 */
const localizedResponse = (req, key, params = {}) => {
  return translate(key, req.language, params);
};

/**
 * Middleware pour ajouter les helpers de traduction
 */
const addTranslationHelpers = () => {
    return (req, res, next) => {
    res.t = (key, params = {}) => localizedResponse(req, key, params);
    res.locals.t = (key, params = {}) => localizedResponse(req, key, params);
      next();
    };
};

module.exports = {
  middleware,
  translate,
  localizedResponse,
  addTranslationHelpers,
  supportedLanguages,
  defaultLanguage
};