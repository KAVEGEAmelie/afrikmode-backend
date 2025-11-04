/**
 * Routes d'internationalisation (i18n)
 * API pour récupérer les traductions et gérer les langues
 */

const express = require('express');
const router = express.Router();
const i18n = require('../middleware/i18n');

/**
 * @route GET /api/i18n/translations/:language?
 * @desc Récupérer toutes les traductions pour une langue
 * @access Public
 */
router.get('/translations/:language?', (req, res) => {
  try {
    const language = req.params.language || req.language || 'fr';
    const translations = i18n.getAllTranslations(language);
    
    res.json({
      success: true,
      message: 'Traductions récupérées',
      data: {
        language,
        translations,
        metadata: i18n.getLocaleMetadata(language)
      }
    });
  } catch (error) {
    console.error('Erreur récupération traductions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * @route POST /api/i18n/translate
 * @desc Traduire des clés spécifiques
 * @access Public
 */
router.post('/translate', (req, res) => {
  try {
    const { keys, language, params } = req.body;
    
    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({
        success: false,
        message: 'Liste de clés requise'
      });
    }
    
    const targetLanguage = language || req.language || 'fr';
    const translations = {};
    
    keys.forEach(key => {
      if (typeof key === 'string') {
        translations[key] = i18n.translate(key, targetLanguage, params || {});
      } else if (typeof key === 'object' && key.key) {
        translations[key.key] = i18n.translate(key.key, targetLanguage, key.params || {});
      }
    });
    
    res.json({
      success: true,
      message: 'Traductions effectuées',
      data: {
        language: targetLanguage,
        translations
      }
    });
  } catch (error) {
    console.error('Erreur traduction:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * @route GET /api/i18n/languages
 * @desc Obtenir la liste des langues supportées
 * @access Public
 */
router.get('/languages', (req, res) => {
  try {
    const languages = i18n.supportedLanguages.map(lang => ({
      code: lang,
      ...i18n.getLocaleMetadata(lang)
    }));
    
    res.json({
      success: true,
      message: 'Langues supportées',
      data: {
        default: i18n.defaultLanguage,
        supported: languages,
        current: req.language || i18n.defaultLanguage
      }
    });
  } catch (error) {
    console.error('Erreur récupération langues:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * @route GET /api/i18n/detect
 * @desc Détecter la langue préférée de l'utilisateur
 * @access Public
 */
router.get('/detect', (req, res) => {
  try {
    const detectedLanguage = i18n.detectLanguage(req);
    const metadata = i18n.getLocaleMetadata(detectedLanguage);
    
    res.json({
      success: true,
      message: 'Langue détectée',
      data: {
        detected: detectedLanguage,
        metadata,
        sources: {
          user: req.user?.preferred_language,
          query: req.query.lang,
          cookie: req.cookies?.language,
          header: req.get('Accept-Language')
        }
      }
    });
  } catch (error) {
    console.error('Erreur détection langue:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * @route POST /api/i18n/set-language
 * @desc Définir la langue préférée (avec cookie)
 * @access Public
 */
router.post('/set-language', (req, res) => {
  try {
    const { language } = req.body;
    
    if (!language || !i18n.supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Langue non supportée',
        data: {
          supported: i18n.supportedLanguages
        }
      });
    }
    
    // Définir le cookie de langue
    res.cookie('language', language, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Mettre à jour la langue de l'utilisateur connecté
    if (req.user) {
      const db = require('../config/database');
      db('users')
        .where({ id: req.user.id })
        .update({ preferred_language: language })
        .catch(error => {
          console.error('Erreur mise à jour langue utilisateur:', error);
        });
    }
    
    res.json({
      success: true,
      message: 'Langue définie',
      data: {
        language,
        metadata: i18n.getLocaleMetadata(language)
      }
    });
  } catch (error) {
    console.error('Erreur définition langue:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * @route GET /api/i18n/localized-data
 * @desc Obtenir des données localisées (devises, formats, etc.)
 * @access Public
 */
router.get('/localized-data', (req, res) => {
  try {
    const language = req.language || 'fr';
    const metadata = i18n.getLocaleMetadata(language);
    
    // Données localisées selon la langue
    const localizedData = {
      language,
      metadata,
      formats: {
        currency: {
          symbol: metadata.currency === 'FCFA' ? 'FCFA' : '$',
          code: metadata.currency,
          position: 'after', // FCFA après le nombre
          decimal: metadata.currency === 'FCFA' ? 0 : 2
        },
        date: {
          format: metadata.dateFormat,
          separator: language === 'fr' ? '/' : '/',
          monthNames: language === 'fr' 
            ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
            : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          dayNames: language === 'fr'
            ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
            : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        },
        number: {
          decimal: language === 'fr' ? ',' : '.',
          thousand: language === 'fr' ? ' ' : ','
        }
      },
      translations: {
        common: i18n.getTranslations([
          'common.welcome',
          'common.hello',
          'common.loading',
          'common.success',
          'common.error'
        ], language)
      }
    };
    
    res.json({
      success: true,
      message: 'Données localisées récupérées',
      data: localizedData
    });
  } catch (error) {
    console.error('Erreur données localisées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

/**
 * @route POST /api/i18n/reload (Development only)
 * @desc Recharger les traductions
 * @access Admin
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/reload', (req, res) => {
    try {
      i18n.reloadTranslations();
      res.json({
        success: true,
        message: 'Traductions rechargées'
      });
    } catch (error) {
      console.error('Erreur rechargement traductions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });
}

module.exports = router;