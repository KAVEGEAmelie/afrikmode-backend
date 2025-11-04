const db = require('../config/database');
const { paginate } = require('../config/database');
const { asyncHandler, commonErrors } = require('../middleware/errorHandler');

/**
 * Démarrer une nouvelle conversation avec un vendeur
 * POST /api/messages/conversations
 */
const startConversation = asyncHandler(async (req, res) => {
  const { vendorId, productId, message } = req.body;
  const customerId = req.user.id;

  // Si pas de vendorId ni message, on retourne juste un message d'erreur
  // Pour lister les conversations, utiliser GET /api/messages/conversations
  if (!vendorId || !message) {
    return res.status(400).json({
      success: false,
      message: 'Pour lister les conversations, utilisez GET /api/messages/conversations. Pour créer une conversation, envoyez vendorId et message.'
    });
  }

  // Vérifier que le vendeur existe
  const vendor = await db('users')
    .where({ id: vendorId })
    .where('role', 'vendor')
    .first();

  if (!vendor) {
    throw commonErrors.notFound('Vendeur introuvable');
  }

  // Vérifier qu'on ne peut pas se contacter soi-même
  if (customerId === vendorId) {
    throw commonErrors.badRequest('Vous ne pouvez pas démarrer une conversation avec vous-même');
  }

  // Vérifier si une conversation existe déjà
  let conversation = await db('conversations')
    .where({ customer_id: customerId, vendor_id: vendorId })
    .where(function() {
      if (productId) {
        this.where('product_id', productId);
      } else {
        this.whereNull('product_id');
      }
    })
    .first();

  // Si la conversation existe, vérifier son statut
  if (conversation) {
    // Réactiver si elle était fermée
    if (conversation.status === 'closed' || conversation.status === 'archived') {
      await db('conversations')
        .where({ id: conversation.id })
        .update({
          status: 'active',
          updated_at: db.fn.now()
        });
    }
  } else {
    // Créer une nouvelle conversation
    const [conversationId] = await db('conversations').insert({
      customer_id: customerId,
      vendor_id: vendorId,
      product_id: productId || null,
      status: 'active',
      created_at: db.fn.now()
    }).returning('id');

    conversation = await db('conversations')
      .where({ id: conversationId })
      .first();
  }

  // Envoyer le premier message
  await db('messages').insert({
    conversation_id: conversation.id,
    sender_id: customerId,
    sender_type: 'customer',
    content: message,
    created_at: db.fn.now()
  });

  // Récupérer la conversation complète avec les infos
  const fullConversation = await getConversationDetails(conversation.id, customerId);

  res.status(201).json({
    success: true,
    message: 'Conversation créée avec succès',
    data: fullConversation
  });
});

/**
 * Récupérer toutes les conversations de l'utilisateur
 * GET /api/messages/conversations
 */
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status = 'active', page = 1, limit = 20 } = req.query;

  let query = db('conversations as c')
    .select([
      'c.*',
      // Info vendeur
      'v.first_name as vendor_first_name',
      'v.last_name as vendor_last_name',
      'v.avatar as vendor_avatar',
      'v.email as vendor_email',
      // Info produit (optionnel)
      'p.name as product_name',
      'p.image_url as product_image',
      'p.slug as product_slug'
    ])
    .leftJoin('users as v', 'c.vendor_id', 'v.id')
    .leftJoin('products as p', 'c.product_id', 'p.id')
    .where('c.customer_id', userId)
    .orderBy('c.last_message_at', 'desc');

  // Filtre par statut
  if (status) {
    query = query.where('c.status', status);
  }

  const result = await paginate(query, page, limit);

  res.json({
    success: true,
    data: result.data.map(conv => ({
      id: conv.id,
      status: conv.status,
      priority: conv.priority,
      tags: JSON.parse(conv.tags || '[]'),
      unreadCount: conv.customer_unread_count,
      lastMessageAt: conv.last_message_at,
      lastMessagePreview: conv.last_message_preview,
      vendor: {
        id: conv.vendor_id,
        firstName: conv.vendor_first_name,
        lastName: conv.vendor_last_name,
        avatar: conv.vendor_avatar,
        email: conv.vendor_email
      },
      product: conv.product_id ? {
        id: conv.product_id,
        name: conv.product_name,
        image: conv.product_image,
        slug: conv.product_slug
      } : null,
      createdAt: conv.created_at
    })),
    pagination: result.pagination
  });
});

/**
 * Récupérer les messages d'une conversation
 * GET /api/messages/conversations/:id
 */
const getConversationMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 50 } = req.query;

  // Vérifier l'accès à la conversation
  const conversation = await db('conversations')
    .where({ id })
    .where('customer_id', userId)
    .first();

  if (!conversation) {
    throw commonErrors.notFound('Conversation introuvable');
  }

  // Récupérer les messages
  let query = db('messages as m')
    .select([
      'm.*',
      'u.first_name',
      'u.last_name',
      'u.avatar'
    ])
    .join('users as u', 'm.sender_id', 'u.id')
    .where('m.conversation_id', id)
    .orderBy('m.created_at', 'asc');

  const result = await paginate(query, page, limit);

  // Marquer les messages du vendeur comme lus
  await db('messages')
    .where('conversation_id', id)
    .where('sender_type', 'vendor')
    .where('is_read', false)
    .update({
      is_read: true,
      read_at: db.fn.now()
    });

  // Réinitialiser le compteur non lu
  await db('conversations')
    .where({ id })
    .update({ customer_unread_count: 0 });

  res.json({
    success: true,
    data: result.data.map(msg => ({
      id: msg.id,
      content: msg.content,
      messageType: msg.message_type,
      attachments: JSON.parse(msg.attachments || '[]'),
      sender: {
        id: msg.sender_id,
        type: msg.sender_type,
        firstName: msg.first_name,
        lastName: msg.last_name,
        avatar: msg.avatar
      },
      isRead: msg.is_read,
      readAt: msg.read_at,
      createdAt: msg.created_at
    })),
    pagination: result.pagination
  });
});

/**
 * Envoyer un message dans une conversation
 * POST /api/messages/conversations/:id/send
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, attachments = [] } = req.body;
  const userId = req.user.id;

  if (!content || content.trim() === '') {
    throw commonErrors.badRequest('Message vide');
  }

  // Vérifier l'accès
  const conversation = await db('conversations')
    .where({ id })
    .where('customer_id', userId)
    .first();

  if (!conversation) {
    throw commonErrors.notFound('Conversation introuvable');
  }

  // Vérifier que la conversation n'est pas fermée
  if (conversation.status === 'closed') {
    throw commonErrors.badRequest('Cette conversation est fermée');
  }

  // Envoyer le message
  const [messageId] = await db('messages').insert({
    conversation_id: id,
    sender_id: userId,
    sender_type: 'customer',
    content: content.trim(),
    attachments: JSON.stringify(attachments),
    created_at: db.fn.now()
  }).returning('id');

  const message = await db('messages as m')
    .select([
      'm.*',
      'u.first_name',
      'u.last_name',
      'u.avatar'
    ])
    .join('users as u', 'm.sender_id', 'u.id')
    .where('m.id', messageId)
    .first();

  res.status(201).json({
    success: true,
    message: 'Message envoyé',
    data: {
      id: message.id,
      content: message.content,
      messageType: message.message_type,
      attachments: JSON.parse(message.attachments || '[]'),
      sender: {
        id: message.sender_id,
        type: message.sender_type,
        firstName: message.first_name,
        lastName: message.last_name,
        avatar: message.avatar
      },
      createdAt: message.created_at
    }
  });
});

/**
 * Fermer une conversation
 * PATCH /api/messages/conversations/:id/close
 */
const closeConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const conversation = await db('conversations')
    .where({ id })
    .where('customer_id', userId)
    .first();

  if (!conversation) {
    throw commonErrors.notFound('Conversation introuvable');
  }

  await db('conversations')
    .where({ id })
    .update({
      status: 'closed',
      updated_at: db.fn.now()
    });

  res.json({
    success: true,
    message: 'Conversation fermée'
  });
});

/**
 * Supprimer une conversation (archiver)
 * DELETE /api/messages/conversations/:id
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const conversation = await db('conversations')
    .where({ id })
    .where('customer_id', userId)
    .first();

  if (!conversation) {
    throw commonErrors.notFound('Conversation introuvable');
  }

  // Archiver au lieu de supprimer
  await db('conversations')
    .where({ id })
    .update({
      status: 'archived',
      updated_at: db.fn.now()
    });

  res.json({
    success: true,
    message: 'Conversation archivée'
  });
});

/**
 * Récupérer le nombre de messages non lus
 * GET /api/messages/unread-count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [{ total }] = await db('conversations')
    .sum('customer_unread_count as total')
    .where('customer_id', userId)
    .where('status', 'active');

  res.json({
    success: true,
    data: {
      unreadCount: parseInt(total) || 0
    }
  });
});

/**
 * Helper: Récupérer les détails complets d'une conversation
 */
async function getConversationDetails(conversationId, userId) {
  const conversation = await db('conversations as c')
    .select([
      'c.*',
      'v.first_name as vendor_first_name',
      'v.last_name as vendor_last_name',
      'v.avatar as vendor_avatar',
      'v.email as vendor_email',
      'p.name as product_name',
      'p.image_url as product_image',
      'p.slug as product_slug'
    ])
    .leftJoin('users as v', 'c.vendor_id', 'v.id')
    .leftJoin('products as p', 'c.product_id', 'p.id')
    .where('c.id', conversationId)
    .first();

  return {
    id: conversation.id,
    status: conversation.status,
    priority: conversation.priority,
    tags: JSON.parse(conversation.tags || '[]'),
    unreadCount: conversation.customer_unread_count,
    lastMessageAt: conversation.last_message_at,
    vendor: {
      id: conversation.vendor_id,
      firstName: conversation.vendor_first_name,
      lastName: conversation.vendor_last_name,
      avatar: conversation.vendor_avatar,
      email: conversation.vendor_email
    },
    product: conversation.product_id ? {
      id: conversation.product_id,
      name: conversation.product_name,
      image: conversation.product_image,
      slug: conversation.product_slug
    } : null,
    createdAt: conversation.created_at
  };
}

module.exports = {
  startConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  closeConversation,
  deleteConversation,
  getUnreadCount
};
