const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');

/**
 * @route GET /api/cart
 * @desc Récupérer le panier de l'utilisateur
 * @access Private
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer le panier de l'utilisateur
    const cartItems = await db('cart_items')
      .select([
        'cart_items.*',
        'products.name as product_name',
        'products.price',
        'products.primary_image as image_url',
        'products.slug'
      ])
      .leftJoin('products', 'cart_items.product_id', 'products.id')
      .where('cart_items.user_id', userId)
      .whereNull('cart_items.deleted_at');

    // Calculer le total
    let total = 0;
    let totalItems = 0;
    
    cartItems.forEach(item => {
      total += item.price * item.quantity;
      totalItems += item.quantity;
    });

    res.json({
      success: true,
      data: {
        items: cartItems,
        total_items: totalItems,
        total_amount: total,
        total: total, // Alias pour compatibilité
        currency: 'FCFA'
      }
    });

  } catch (error) {
    console.error('Erreur récupération panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/cart
 * @desc Ajouter un produit au panier
 * @access Private
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.id;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'ID du produit requis'
      });
    }

    // Vérifier si le produit existe
    const product = await db('products')
      .where({ id: product_id })
      .whereNull('deleted_at')
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier si l'article est déjà dans le panier
    const existingItem = await db('cart_items')
      .where({ user_id: userId, product_id })
      .whereNull('deleted_at')
      .first();

    if (existingItem) {
      // Mettre à jour la quantité
      await db('cart_items')
        .where({ id: existingItem.id })
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: db.fn.now()
        });
    } else {
      // Ajouter un nouvel article
      await db('cart_items').insert({
        user_id: userId,
        product_id,
        quantity,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
    }

    res.json({
      success: true,
      message: 'Produit ajouté au panier'
    });

  } catch (error) {
    console.error('Erreur ajout panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout au panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/cart/:itemId
 * @desc Mettre à jour la quantité d'un article du panier
 * @access Private
 */
router.put('/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantité invalide'
      });
    }

    if (quantity === 0) {
      // Supprimer l'article du panier
      await db('cart_items')
        .where({ id: itemId, user_id: userId })
        .update({ deleted_at: db.fn.now() });
    } else {
      // Mettre à jour la quantité
      await db('cart_items')
        .where({ id: itemId, user_id: userId })
        .update({
          quantity,
          updated_at: db.fn.now()
        });
    }

    res.json({
      success: true,
      message: 'Panier mis à jour'
    });

  } catch (error) {
    console.error('Erreur mise à jour panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/cart/:itemId
 * @desc Supprimer un article du panier
 * @access Private
 */
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    await db('cart_items')
      .where({ id: itemId, user_id: userId })
      .update({ deleted_at: db.fn.now() });

    res.json({
      success: true,
      message: 'Article supprimé du panier'
    });

  } catch (error) {
    console.error('Erreur suppression panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/cart
 * @desc Vider le panier
 * @access Private
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    await db('cart_items')
      .where({ user_id: userId })
      .update({ deleted_at: db.fn.now() });

    res.json({
      success: true,
      message: 'Panier vidé'
    });

  } catch (error) {
    console.error('Erreur vidage panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du vidage du panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
