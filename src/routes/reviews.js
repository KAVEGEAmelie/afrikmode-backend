const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');

/**
 * @route   POST /api/reviews
 * @desc    Créer un nouvel avis
 * @access  Private (utilisateur connecté)
 */
router.post('/', requireAuth, reviewController.createReview);

/**
 * @route   GET /api/reviews/product/:productId
 * @desc    Récupérer tous les avis d'un produit
 * @access  Public
 */
router.get('/product/:productId', reviewController.getProductReviews);

/**
 * @route   GET /api/reviews/my-reviews
 * @desc    Récupérer les avis de l'utilisateur connecté
 * @access  Private
 */
router.get('/my-reviews', requireAuth, reviewController.getMyReviews);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Mettre à jour un avis
 * @access  Private (propriétaire seulement)
 */
router.put('/:id', requireAuth, reviewController.updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Supprimer un avis
 * @access  Private (propriétaire seulement)
 */
router.delete('/:id', requireAuth, reviewController.deleteReview);

/**
 * @route   POST /api/reviews/:id/helpful
 * @desc    Marquer un avis comme utile/pas utile
 * @access  Private
 */
router.post('/:id/helpful', requireAuth, reviewController.markReviewHelpful);

module.exports = router;
