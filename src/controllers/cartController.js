// src/controllers/cartController.js
const db = require('../config/database');
const { paginate } = require('../config/database');

/**
 * @route GET /api/cart
 * @desc Récupérer le panier de l'utilisateur connecté
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.selected_color,
        ci.selected_size,
        ci.added_at,
        p.name as product_name,
        p.price as product_price,
        p.images as product_images,
        p.stock as product_stock,
        (ci.quantity * p.price) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1 AND p.status = 'published'
      ORDER BY ci.added_at DESC
    `;

    const result = await db.query(query, [userId]);
    const cartItems = result.rows;

    // Calculer le total
    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        summary: {
          item_count: itemCount,
          subtotal: total,
          shipping: 0, // À calculer selon l'adresse
          tax: 0, // À calculer selon le pays
          total: total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du panier', error: error.message });
  }
};

/**
 * @route POST /api/cart
 * @desc Ajouter un produit au panier
 */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1, selected_color, selected_size } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id requis' });
    }

    // Vérifier si le produit existe et est disponible
    const productResult = await db.query(
      'SELECT id, name, price, stock, status FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const product = productResult.rows[0];

    if (product.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Produit non disponible' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: `Stock insuffisant (${product.stock} disponibles)` });
    }

    // Vérifier si le produit est déjà dans le panier
    const existingResult = await db.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2 AND selected_color = $3 AND selected_size = $4',
      [userId, product_id, selected_color || null, selected_size || null]
    );

    let cartItem;

    if (existingResult.rows.length > 0) {
      // Mettre à jour la quantité
      const existing = existingResult.rows[0];
      const newQuantity = existing.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({ success: false, message: `Stock insuffisant (${product.stock} disponibles)` });
      }

      await db.query(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, existing.id]
      );

      cartItem = { id: existing.id, quantity: newQuantity };
    } else {
      // Insérer un nouvel article
      const result = await db.query(
        `INSERT INTO cart_items (user_id, product_id, quantity, selected_color, selected_size, added_at) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id`,
        [userId, product_id, quantity, selected_color || null, selected_size || null]
      );

      cartItem = { id: result.rows[0].id, quantity };
    }

    res.status(201).json({
      success: true,
      message: 'Produit ajouté au panier',
      data: {
        cart_item_id: cartItem.id,
        product_id,
        quantity: cartItem.quantity,
        product_name: product.name,
        product_price: product.price
      }
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout au panier', error: error.message });
  }
};

/**
 * @route PUT /api/cart/:id
 * @desc Mettre à jour la quantité d'un article du panier
 */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantité invalide' });
    }

    // Vérifier que l'article appartient à l'utilisateur
    const cartItemResult = await db.query(
      `SELECT ci.id, ci.product_id, p.stock 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1 AND ci.user_id = $2`,
      [id, userId]
    );

    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Article non trouvé dans le panier' });
    }

    const cartItem = cartItemResult.rows[0];

    if (cartItem.stock < quantity) {
      return res.status(400).json({ success: false, message: `Stock insuffisant (${cartItem.stock} disponibles)` });
    }

    await db.query(
      'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [quantity, id]
    );

    res.json({
      success: true,
      message: 'Quantité mise à jour',
      data: { id, quantity }
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour', error: error.message });
  }
};

/**
 * @route DELETE /api/cart/:id
 * @desc Supprimer un article du panier
 */
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Article non trouvé' });
    }

    res.json({
      success: true,
      message: 'Article supprimé du panier'
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression', error: error.message });
  }
};

/**
 * @route DELETE /api/cart
 * @desc Vider le panier
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      message: 'Panier vidé avec succès'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du vidage du panier', error: error.message });
  }
};
