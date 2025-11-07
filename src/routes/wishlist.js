const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');

/**
 * @route GET /api/wishlist
 * @desc Récupérer la liste de souhaits de l'utilisateur
 * @access Private
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer la wishlist de l'utilisateur
    const wishlistItems = await db('wishlist_items')
      .select([
        'wishlist_items.*',
        'products.name as product_name',
        'products.price',
        'products.primary_image as image_url',
        'products.slug',
        'products.description'
      ])
      .leftJoin('products', 'wishlist_items.product_id', 'products.id')
      .where('wishlist_items.user_id', userId)
      .whereNull('wishlist_items.deleted_at');

    res.json({
      success: true,
      data: {
        items: wishlistItems,
        count: wishlistItems.length
      }
    });

  } catch (error) {
    console.error('Erreur récupération wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la liste de souhaits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/wishlist
 * @desc Ajouter un produit à la wishlist
 * @access Private
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('📝 POST /api/wishlist - Body:', req.body);
    const { productId, product_id } = req.body;
    const userId = req.user.id;

    // Accepter productId ou product_id
    const finalProductId = productId || product_id;
    console.log('🔍 productId reçu:', finalProductId);

    if (!finalProductId) {
      console.error('❌ productId manquant dans le body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'productId requis dans le body'
      });
    }

    // Vérifier si le produit existe
    const product = await db('products')
      .where({ id: finalProductId })
      .whereNull('deleted_at')
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier si le produit est déjà dans la wishlist
    const existingItem = await db('wishlist_items')
      .where({ user_id: userId, product_id: finalProductId })
      .whereNull('deleted_at')
      .first();

    if (existingItem) {
      return res.json({
        success: true,
        message: 'Produit déjà dans la liste de souhaits'
      });
    }

    // Ajouter à la wishlist
    await db('wishlist_items').insert({
      user_id: userId,
      product_id: finalProductId,
      created_at: db.fn.now()
    });

    res.json({
      success: true,
      message: 'Produit ajouté à la liste de souhaits'
    });

  } catch (error) {
    console.error('❌ Erreur ajout wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout à la liste de souhaits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/wishlist/count
 * @desc Récupérer le nombre d'articles dans la wishlist
 * @access Private
 */
router.get('/count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await db('wishlist_items')
      .where('user_id', userId)
      .whereNull('deleted_at')
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        count: parseInt(count.count) || 0
      }
    });

  } catch (error) {
    console.error('Erreur récupération count wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du nombre de favoris',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/wishlist/:productId
 * @desc Ajouter un produit à la wishlist
 * @access Private
 */
router.post('/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Vérifier si le produit existe
    const product = await db('products')
      .where({ id: productId })
      .whereNull('deleted_at')
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    // Vérifier si le produit est déjà dans la wishlist
    const existingItem = await db('wishlist_items')
      .where({ user_id: userId, product_id: productId })
      .whereNull('deleted_at')
      .first();

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Produit déjà dans la liste de souhaits'
      });
    }

    // Ajouter à la wishlist
    await db('wishlist_items').insert({
      user_id: userId,
      product_id: productId,
      created_at: db.fn.now()
    });

    res.json({
      success: true,
      message: 'Produit ajouté à la liste de souhaits'
    });

  } catch (error) {
    console.error('Erreur ajout wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout à la liste de souhaits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/wishlist/:productId
 * @desc Supprimer un produit de la wishlist
 * @access Private
 */
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const deleted = await db('wishlist_items')
      .where({ user_id: userId, product_id: productId })
      .update({ deleted_at: db.fn.now() });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé dans la liste de souhaits'
      });
    }

    res.json({
      success: true,
      message: 'Produit supprimé de la liste de souhaits'
    });

  } catch (error) {
    console.error('Erreur suppression wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la liste de souhaits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/wishlist
 * @desc Vider la wishlist
 * @access Private
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    await db('wishlist_items')
      .where({ user_id: userId })
      .update({ deleted_at: db.fn.now() });

    res.json({
      success: true,
      message: 'Liste de souhaits vidée'
    });

  } catch (error) {
    console.error('Erreur vidage wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du vidage de la liste de souhaits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route DELETE /api/wishlist/all
 * @desc Vider la wishlist (alias)
 * @access Private
 */
router.delete('/all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    await db('wishlist_items')
      .where({ user_id: userId })
      .update({ deleted_at: db.fn.now() });

    res.json({
      success: true,
      message: 'Liste de souhaits vidée'
    });

  } catch (error) {
    console.error('Erreur vidage wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du vidage de la liste de souhaits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/wishlist/:productId/check
 * @desc Vérifier si un produit est dans la wishlist
 * @access Private
 */
router.get('/:productId/check', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const item = await db('wishlist_items')
      .where({ user_id: userId, product_id: productId })
      .whereNull('deleted_at')
      .first();

    res.json({
      success: true,
      in_wishlist: !!item
    });

  } catch (error) {
    console.error('Erreur vérification wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/wishlist/:productId/move-to-cart
 * @desc Déplacer un produit de la wishlist vers le panier
 * @access Private
 */
router.post('/:productId/move-to-cart', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Vérifier si le produit est dans la wishlist
    const wishlistItem = await db('wishlist_items')
      .where({ user_id: userId, product_id: productId })
      .whereNull('deleted_at')
      .first();

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé dans la liste de souhaits'
      });
    }

    // Vérifier si le produit est déjà dans le panier
    const existingCartItem = await db('cart_items')
      .where({ user_id: userId, product_id: productId })
      .whereNull('deleted_at')
      .first();

    if (existingCartItem) {
      // Si déjà dans le panier, juste supprimer de la wishlist
      await db('wishlist_items')
        .where({ id: wishlistItem.id })
        .update({ deleted_at: db.fn.now() });

      return res.json({
        success: true,
        message: 'Produit déjà dans le panier, retiré de la liste de souhaits'
      });
    }

    // Ajouter au panier
    await db('cart_items').insert({
      user_id: userId,
      product_id: productId,
      quantity: 1,
      created_at: db.fn.now()
    });

    // Retirer de la wishlist
    await db('wishlist_items')
      .where({ id: wishlistItem.id })
      .update({ deleted_at: db.fn.now() });

    res.json({
      success: true,
      message: 'Produit déplacé vers le panier'
    });

  } catch (error) {
    console.error('Erreur déplacement vers panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du déplacement vers le panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/wishlist/move-all-to-cart
 * @desc Déplacer tous les produits de la wishlist vers le panier
 * @access Private
 */
router.post('/move-all-to-cart', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer tous les produits de la wishlist
    const wishlistItems = await db('wishlist_items')
      .where({ user_id: userId })
      .whereNull('deleted_at');

    if (wishlistItems.length === 0) {
      return res.json({
        success: true,
        message: 'Liste de souhaits vide',
        moved: 0
      });
    }

    let moved = 0;
    let skipped = 0;

    for (const item of wishlistItems) {
      // Vérifier si déjà dans le panier
      const existingCartItem = await db('cart_items')
        .where({ user_id: userId, product_id: item.product_id })
        .whereNull('deleted_at')
        .first();

      if (!existingCartItem) {
        // Ajouter au panier
        await db('cart_items').insert({
          user_id: userId,
          product_id: item.product_id,
          quantity: 1,
          created_at: db.fn.now()
        });
        moved++;
      } else {
        skipped++;
      }

      // Retirer de la wishlist
      await db('wishlist_items')
        .where({ id: item.id })
        .update({ deleted_at: db.fn.now() });
    }

    res.json({
      success: true,
      message: `${moved} produit(s) déplacé(s) vers le panier`,
      moved,
      skipped
    });

  } catch (error) {
    console.error('Erreur déplacement tous vers panier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du déplacement vers le panier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/wishlist/share
 * @desc Partager la wishlist (générer un lien de partage)
 * @access Private
 */
router.post('/share', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Générer un token de partage unique
    const shareToken = require('crypto').randomBytes(32).toString('hex');

    // Sauvegarder le token (vous pouvez créer une table share_tokens si nécessaire)
    // Pour l'instant, on retourne juste un message

    res.json({
      success: true,
      message: 'Lien de partage généré',
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/wishlist/shared/${shareToken}`,
      token: shareToken
    });

  } catch (error) {
    console.error('Erreur partage wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du lien de partage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
