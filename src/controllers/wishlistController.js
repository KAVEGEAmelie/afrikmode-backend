// src/controllers/wishlistController.js
const db = require('../config/database');

/**
 * @route GET /api/wishlist
 * @desc Récupérer la liste de souhaits de l'utilisateur
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        w.id,
        w.product_id,
        w.added_at,
        p.name as product_name,
        p.price as product_price,
        p.old_price,
        p.images as product_images,
        p.stock as product_stock,
        p.status as product_status,
        p.rating,
        p.review_count
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.added_at DESC
    `;

    const result = await db.query(query, [userId]);
    const items = result.rows;

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des favoris', error: error.message });
  }
};

/**
 * @route POST /api/wishlist
 * @desc Ajouter un produit aux favoris
 */
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id requis' });
    }

    // Vérifier si le produit existe
    const productResult = await db.query(
      'SELECT id, name FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    // Vérifier si déjà dans les favoris
    const existingResult = await db.query(
      'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Produit déjà dans les favoris' });
    }

    // Ajouter aux favoris
    const result = await db.query(
      'INSERT INTO wishlist (user_id, product_id, added_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id',
      [userId, product_id]
    );

    res.status(201).json({
      success: true,
      message: 'Produit ajouté aux favoris',
      data: {
        wishlist_id: result.rows[0].id,
        product_id,
        product_name: productResult.rows[0].name
      }
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout aux favoris', error: error.message });
  }
};

/**
 * @route DELETE /api/wishlist/:productId
 * @desc Supprimer un produit des favoris
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await db.query(
      'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé dans les favoris' });
    }

    res.json({
      success: true,
      message: 'Produit retiré des favoris'
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression', error: error.message });
  }
};

/**
 * @route GET /api/wishlist/check/:productId
 * @desc Vérifier si un produit est dans les favoris
 */
exports.checkInWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await db.query(
      'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    res.json({
      success: true,
      in_wishlist: result.rows.length > 0
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la vérification', error: error.message });
  }
};
