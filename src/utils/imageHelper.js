/**
 * Helper pour gérer les URLs des images
 */

const path = require('path');

/**
 * Génère l'URL complète d'une image
 * @param {string} imagePath - Chemin relatif de l'image
 * @returns {string} URL complète de l'image
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return null;
  }

  // Si c'est déjà une URL complète, la retourner
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  // Si le chemin commence par /uploads, l'utiliser tel quel
  if (imagePath.startsWith('/uploads')) {
    return `${baseUrl}${imagePath}`;
  }

  // Sinon, ajouter /uploads
  return `${baseUrl}/uploads/${imagePath}`;
};

/**
 * Transforme un produit pour ajouter les URLs complètes des images
 * @param {Object} product - Produit à transformer
 * @returns {Object} Produit avec URLs complètes
 */
const transformProductImages = (product) => {
  if (!product) return product;

  return {
    ...product,
    primary_image: getImageUrl(product.primary_image),
    images: product.images 
      ? (Array.isArray(product.images) 
          ? product.images.map(img => getImageUrl(img))
          : JSON.parse(product.images).map(img => getImageUrl(img)))
      : [],
    // Pour compatibilité avec le frontend
    image_url: getImageUrl(product.primary_image)
  };
};

/**
 * Transforme une liste de produits
 * @param {Array} products - Liste de produits
 * @returns {Array} Produits avec URLs complètes
 */
const transformProductsImages = (products) => {
  if (!Array.isArray(products)) return products;
  return products.map(transformProductImages);
};

/**
 * Transforme une boutique pour ajouter les URLs complètes des images
 * @param {Object} store - Boutique à transformer
 * @returns {Object} Boutique avec URLs complètes
 */
const transformStoreImages = (store) => {
  if (!store) return store;

  return {
    ...store,
    logo_url: getImageUrl(store.logo_url),
    banner_url: getImageUrl(store.banner_url)
  };
};

/**
 * Transforme un utilisateur pour ajouter l'URL complète de l'avatar
 * @param {Object} user - Utilisateur à transformer
 * @returns {Object} Utilisateur avec URL complète
 */
const transformUserAvatar = (user) => {
  if (!user) return user;

  return {
    ...user,
    avatar_url: getImageUrl(user.avatar_url)
  };
};

module.exports = {
  getImageUrl,
  transformProductImages,
  transformProductsImages,
  transformStoreImages,
  transformUserAvatar
};
