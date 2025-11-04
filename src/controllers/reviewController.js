const db = require('../config/database');
const { asyncHandler, commonErrors } = require('../middleware/errorHandler');
const upload = require('../middleware/upload');

/**
 * Créer un nouvel avis sur un produit
 * POST /api/reviews
 */
const createReview = asyncHandler(async (req, res) => {
  const { productId, orderId, rating, comment, images = [] } = req.body;
  const userId = req.user.id;

  // Validation
  if (!productId || !rating) {
    throw commonErrors.badRequest('Produit ID et note requis');
  }

  if (rating < 1 || rating > 5) {
    throw commonErrors.badRequest('La note doit être entre 1 et 5');
  }

  // Vérifier que le produit existe
  const product = await db('products')
    .where({ id: productId })
    .whereNull('deleted_at')
    .first();

  if (!product) {
    throw commonErrors.notFound('Produit introuvable');
  }

  // Vérifier que l'utilisateur n'a pas déjà laissé un avis pour ce produit
  const existingReview = await db('reviews')
    .where({ user_id: userId, product_id: productId })
    .first();

  if (existingReview) {
    throw commonErrors.badRequest('Vous avez déjà laissé un avis pour ce produit');
  }

  // Vérifier si c'est un achat vérifié
  let verifiedPurchase = false;
  if (orderId) {
    const orderItem = await db('order_items as oi')
      .join('orders as o', 'oi.order_id', 'o.id')
      .where('o.id', orderId)
      .where('o.customer_id', userId)
      .where('oi.product_id', productId)
      .where('o.status', 'delivered')
      .first();

    if (orderItem) {
      verifiedPurchase = true;
    }
  } else {
    // Vérifier si l'utilisateur a déjà acheté ce produit
    const hasOrdered = await db('order_items as oi')
      .join('orders as o', 'oi.order_id', 'o.id')
      .where('o.customer_id', userId)
      .where('oi.product_id', productId)
      .where('o.status', 'delivered')
      .first();

    if (hasOrdered) {
      verifiedPurchase = true;
      orderId = hasOrdered.order_id;
    }
  }

  // Créer l'avis
  const [reviewId] = await db('reviews').insert({
    user_id: userId,
    product_id: productId,
    order_id: orderId,
    rating,
    comment: comment || null,
    images: JSON.stringify(images),
    verified_purchase: verifiedPurchase,
    status: 'pending', // Modération avant publication
    created_at: db.fn.now()
  }).returning('id');

  // Récupérer l'avis créé avec les infos utilisateur
  const review = await db('reviews as r')
    .select([
      'r.*',
      'u.first_name',
      'u.last_name',
      'u.avatar'
    ])
    .join('users as u', 'r.user_id', 'u.id')
    .where('r.id', reviewId)
    .first();

  // Mettre à jour les statistiques du produit (en arrière-plan)
  updateProductRatingStats(productId).catch(error => {
    console.error('Erreur mise à jour stats produit:', error);
  });

  res.status(201).json({
    success: true,
    message: 'Votre avis a été soumis avec succès. Il sera publié après modération.',
    data: {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      verifiedPurchase: review.verified_purchase,
      status: review.status,
      createdAt: review.created_at,
      user: {
        firstName: review.first_name,
        lastName: review.last_name,
        avatar: review.avatar
      }
    }
  });
});

/**
 * Récupérer les avis d'un produit
 * GET /api/reviews/product/:productId
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const {
    page = 1,
    limit = 10,
    rating,
    sortBy = 'created_at',
    sortOrder = 'desc',
    verifiedOnly = false
  } = req.query;

  let query = db('reviews as r')
    .select([
      'r.id',
      'r.rating',
      'r.comment',
      'r.images',
      'r.verified_purchase',
      'r.helpful_count',
      'r.unhelpful_count',
      'r.vendor_response',
      'r.responded_at',
      'r.created_at',
      'u.first_name',
      'u.last_name',
      'u.avatar'
    ])
    .join('users as u', 'r.user_id', 'u.id')
    .where('r.product_id', productId)
    .where('r.status', 'approved'); // Seulement les avis approuvés

  // Filtre par note
  if (rating) {
    query = query.where('r.rating', rating);
  }

  // Filtre achats vérifiés
  if (verifiedOnly === 'true') {
    query = query.where('r.verified_purchase', true);
  }

  // Tri
  const validSortFields = ['created_at', 'rating', 'helpful_count'];
  const sortField = validSortFields.includes(sortBy) ? `r.${sortBy}` : 'r.created_at';
  const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  
  query = query.orderBy(sortField, order);

  // Pagination
  const result = await db.helpers.paginate(query, page, limit);

  // Pour chaque avis, vérifier si l'utilisateur actuel l'a trouvé utile
  if (req.user) {
    const reviewIds = result.data.map(r => r.id);
    const userHelpful = await db('review_helpful')
      .select(['review_id', 'is_helpful'])
      .where('user_id', req.user.id)
      .whereIn('review_id', reviewIds);

    const helpfulMap = userHelpful.reduce((acc, h) => {
      acc[h.review_id] = h.is_helpful;
      return acc;
    }, {});

    result.data = result.data.map(review => ({
      ...review,
      userHelpfulVote: helpfulMap[review.id] || null
    }));
  }

  // Statistiques globales
  const [stats] = await db('reviews')
    .select([
      db.raw('COUNT(*) as total_reviews'),
      db.raw('AVG(rating) as average_rating'),
      db.raw('SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5'),
      db.raw('SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4'),
      db.raw('SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3'),
      db.raw('SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2'),
      db.raw('SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1'),
      db.raw('SUM(CASE WHEN verified_purchase = true THEN 1 ELSE 0 END) as verified_count')
    ])
    .where('product_id', productId)
    .where('status', 'approved');

  res.json({
    success: true,
    data: result.data.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: JSON.parse(review.images || '[]'),
      verifiedPurchase: review.verified_purchase,
      helpful: {
        count: review.helpful_count,
        unhelpfulCount: review.unhelpful_count,
        userVote: review.userHelpfulVote
      },
      vendorResponse: review.vendor_response ? {
        response: review.vendor_response,
        respondedAt: review.responded_at
      } : null,
      user: {
        firstName: review.first_name,
        lastName: review.last_name,
        avatar: review.avatar
      },
      createdAt: review.created_at
    })),
    stats: {
      totalReviews: parseInt(stats.total_reviews) || 0,
      averageRating: parseFloat(stats.average_rating) || 0,
      distribution: {
        5: parseInt(stats.rating_5) || 0,
        4: parseInt(stats.rating_4) || 0,
        3: parseInt(stats.rating_3) || 0,
        2: parseInt(stats.rating_2) || 0,
        1: parseInt(stats.rating_1) || 0
      },
      verifiedCount: parseInt(stats.verified_count) || 0
    },
    pagination: result.pagination
  });
});

/**
 * Mettre à jour un avis
 * PUT /api/reviews/:id
 */
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment, images } = req.body;
  const userId = req.user.id;

  const review = await db('reviews')
    .where({ id })
    .first();

  if (!review) {
    throw commonErrors.notFound('Avis introuvable');
  }

  if (review.user_id !== userId) {
    throw commonErrors.forbidden('Vous ne pouvez modifier que vos propres avis');
  }

  const updateData = {
    updated_at: db.fn.now()
  };

  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      throw commonErrors.badRequest('La note doit être entre 1 et 5');
    }
    updateData.rating = rating;
  }

  if (comment !== undefined) {
    updateData.comment = comment;
  }

  if (images !== undefined) {
    updateData.images = JSON.stringify(images);
  }

  // Remettre en modération après modification
  updateData.status = 'pending';

  await db('reviews')
    .where({ id })
    .update(updateData);

  // Mettre à jour les stats produit
  updateProductRatingStats(review.product_id).catch(console.error);

  res.json({
    success: true,
    message: 'Avis mis à jour avec succès'
  });
});

/**
 * Supprimer un avis
 * DELETE /api/reviews/:id
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const review = await db('reviews')
    .where({ id })
    .first();

  if (!review) {
    throw commonErrors.notFound('Avis introuvable');
  }

  if (review.user_id !== userId) {
    throw commonErrors.forbidden('Vous ne pouvez supprimer que vos propres avis');
  }

  await db('reviews')
    .where({ id })
    .delete();

  // Mettre à jour les stats produit
  updateProductRatingStats(review.product_id).catch(console.error);

  res.json({
    success: true,
    message: 'Avis supprimé avec succès'
  });
});

/**
 * Marquer un avis comme utile/pas utile
 * POST /api/reviews/:id/helpful
 */
const markReviewHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isHelpful } = req.body; // true = utile, false = pas utile
  const userId = req.user.id;

  if (typeof isHelpful !== 'boolean') {
    throw commonErrors.badRequest('isHelpful doit être un booléen');
  }

  const review = await db('reviews')
    .where({ id })
    .first();

  if (!review) {
    throw commonErrors.notFound('Avis introuvable');
  }

  // Vérifier si l'utilisateur a déjà voté
  const existingVote = await db('review_helpful')
    .where({ review_id: id, user_id: userId })
    .first();

  if (existingVote) {
    // Mettre à jour le vote
    await db('review_helpful')
      .where({ review_id: id, user_id: userId })
      .update({ is_helpful: isHelpful });
  } else {
    // Créer un nouveau vote
    await db('review_helpful').insert({
      review_id: id,
      user_id: userId,
      is_helpful: isHelpful
    });
  }

  res.json({
    success: true,
    message: 'Vote enregistré'
  });
});

/**
 * Récupérer les avis de l'utilisateur connecté
 * GET /api/reviews/my-reviews
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  let query = db('reviews as r')
    .select([
      'r.*',
      'p.name as product_name',
      'p.slug as product_slug',
      'p.image_url as product_image'
    ])
    .join('products as p', 'r.product_id', 'p.id')
    .where('r.user_id', userId)
    .orderBy('r.created_at', 'desc');

  const result = await db.helpers.paginate(query, page, limit);

  res.json({
    success: true,
    data: result.data.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: JSON.parse(review.images || '[]'),
      verifiedPurchase: review.verified_purchase,
      status: review.status,
      helpfulCount: review.helpful_count,
      vendorResponse: review.vendor_response,
      product: {
        name: review.product_name,
        slug: review.product_slug,
        image: review.product_image
      },
      createdAt: review.created_at,
      updatedAt: review.updated_at
    })),
    pagination: result.pagination
  });
});

/**
 * Fonction helper: Mettre à jour les statistiques de notation d'un produit
 */
async function updateProductRatingStats(productId) {
  const [stats] = await db('reviews')
    .select([
      db.raw('COUNT(*) as total_reviews'),
      db.raw('AVG(rating) as average_rating')
    ])
    .where('product_id', productId)
    .where('status', 'approved');

  await db('products')
    .where({ id: productId })
    .update({
      average_rating: parseFloat(stats.average_rating) || 0,
      reviews_count: parseInt(stats.total_reviews) || 0
    });
}

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getMyReviews
};
