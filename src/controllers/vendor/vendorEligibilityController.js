const db = require('../../config/database');

/**
 * Vérifie l'éligibilité d'un utilisateur à devenir vendeur
 */
exports.checkEligibility = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les informations de l'utilisateur
    const user = await db('users')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'utilisateur est déjà vendeur
    if (user.role === 'vendor' || user.role === 'admin') {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'ALREADY_VENDOR',
        message: 'Vous êtes déjà vendeur',
        data: {
          currentRole: user.role
        }
      });
    }

    // Vérifier si l'email est vérifié
    if (!user.email_verified) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'EMAIL_NOT_VERIFIED',
        message: 'Vous devez vérifier votre email avant de devenir vendeur',
        data: {
          email: user.email,
          emailVerified: false
        }
      });
    }

    // Vérifier si l'utilisateur a une boutique en attente
    const existingStore = await db('stores')
      .where({ owner_id: userId })
      .first();

    if (existingStore) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'STORE_EXISTS',
        message: 'Vous avez déjà une demande de boutique',
        data: {
          storeId: existingStore.id,
          storeStatus: existingStore.status,
          storeName: existingStore.name
        }
      });
    }

    // Vérifier le compte (peut ajouter d'autres conditions)
    const accountAge = new Date() - new Date(user.created_at);
    const minAccountAge = 0; // Pas de minimum pour l'instant
    
    if (accountAge < minAccountAge) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'ACCOUNT_TOO_NEW',
        message: 'Votre compte est trop récent',
        data: {
          accountCreated: user.created_at
        }
      });
    }

    // Vérifier si le compte est actif
    if (user.status !== 'active') {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: 'ACCOUNT_NOT_ACTIVE',
        message: 'Votre compte n\'est pas actif',
        data: {
          accountStatus: user.status
        }
      });
    }

    // L'utilisateur est éligible
    return res.status(200).json({
      success: true,
      eligible: true,
      message: 'Vous êtes éligible pour devenir vendeur',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: user.email_verified,
          status: user.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'éligibilité:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification d\'éligibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Initie la demande pour devenir vendeur
 */
exports.requestVendorStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      storeName,
      storeDescription,
      businessType,
      phone,
      address,
      city,
      country
    } = req.body;

    // Vérifier l'éligibilité d'abord
    const user = await db('users')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez vérifier votre email avant de devenir vendeur'
      });
    }

    if (user.role === 'vendor' || user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà vendeur'
      });
    }

    // Vérifier si une boutique existe déjà
    const existingStore = await db('stores')
      .where({ owner_id: userId })
      .first();

    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une demande de boutique en cours',
        data: {
          storeId: existingStore.id,
          storeStatus: existingStore.status
        }
      });
    }

    // Créer la boutique avec le statut "pending"
    const slug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const [newStore] = await db('stores')
      .insert({
        owner_id: userId,
        name: storeName,
        slug: slug,
        description: storeDescription,
        business_type: businessType,
        phone: phone,
        address: address,
        city: city,
        country: country || 'TG',
        status: 'pending',
        email: user.email,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    // Envoyer une notification à l'admin (à implémenter)
    // await notificationService.notifyAdminNewVendorRequest(newStore);

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été envoyée avec succès. Un administrateur la vérifiera bientôt.',
      data: {
        store: {
          id: newStore.id,
          name: newStore.name,
          status: newStore.status,
          createdAt: newStore.created_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la demande vendeur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande vendeur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
