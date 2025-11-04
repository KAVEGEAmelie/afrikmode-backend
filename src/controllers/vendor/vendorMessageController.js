const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get vendor conversations
 * @route   GET /api/vendor/messages/conversations
 * @access  Private/Vendor
 */
exports.getConversations = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('conversations as c')
      .where('c.vendor_id', vendorId)
      .leftJoin('messages as m', function() {
        this.on('c.id', '=', 'm.conversation_id')
            .andOn('m.id', '=', db.raw('(SELECT MAX(id) FROM messages WHERE conversation_id = c.id)'));
      })
      .leftJoin('users as u', 'c.user_id', 'u.id')
      .select(
        'c.id',
        'c.user_id',
        'c.status',
        'c.created_at',
        'c.updated_at',
        'u.first_name',
        'u.last_name',
        'u.email',
        'u.avatar',
        'm.content as last_message',
        'm.created_at as last_message_at',
        'm.sender_type as last_sender_type',
        db.raw('(SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_type = "user" AND is_read = false) as unread_count')
      );

    if (status) query = query.where('c.status', status);

    const [{ count: total }] = await query.clone().count('c.id as count');
    const conversations = await query
      .orderBy('m.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    successResponse(res, {
      conversations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Conversations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get conversation messages
 * @route   GET /api/vendor/messages/conversations/:id
 * @access  Private/Vendor
 */
exports.getConversationMessages = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify access
    const conversation = await db('conversations')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!conversation) throw new AppError('Conversation not found', 404);

    const [{ count: total }] = await db('messages')
      .where('conversation_id', id)
      .count('* as count');

    const messages = await db('messages')
      .where('conversation_id', id)
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset(offset)
      .select('*');

    // Mark vendor's unread messages as read
    await db('messages')
      .where('conversation_id', id)
      .where('sender_type', 'user')
      .where('is_read', false)
      .update({ is_read: true, read_at: db.fn.now() });

    successResponse(res, {
      conversation,
      messages,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Messages retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send message
 * @route   POST /api/vendor/messages/conversations/:id/send
 * @access  Private/Vendor
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { content, attachments } = req.body;

    // Verify access
    const conversation = await db('conversations')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!conversation) throw new AppError('Conversation not found', 404);

    const [messageId] = await db('messages').insert({
      conversation_id: id,
      sender_id: req.user.id,
      sender_type: 'vendor',
      content,
      attachments: attachments ? JSON.stringify(attachments) : null,
      is_read: false,
      created_at: db.fn.now()
    });

    // Update conversation
    await db('conversations')
      .where('id', id)
      .update({ updated_at: db.fn.now() });

    const message = await db('messages').where('id', messageId).first();
    successResponse(res, { message }, 'Message sent successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PATCH /api/vendor/messages/conversations/:id/read
 * @access  Private/Vendor
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    // Verify access
    const conversation = await db('conversations')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!conversation) throw new AppError('Conversation not found', 404);

    await db('messages')
      .where('conversation_id', id)
      .where('sender_type', 'user')
      .where('is_read', false)
      .update({ is_read: true, read_at: db.fn.now() });

    successResponse(res, null, 'Messages marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread count
 * @route   GET /api/vendor/messages/unread-count
 * @access  Private/Vendor
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const [{ unread_count }] = await db('messages as m')
      .join('conversations as c', 'm.conversation_id', 'c.id')
      .where('c.vendor_id', vendorId)
      .where('m.sender_type', 'user')
      .where('m.is_read', false)
      .count('* as unread_count');

    successResponse(res, { unread_count: parseInt(unread_count) || 0 }, 'Unread count retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Close conversation
 * @route   PATCH /api/vendor/messages/conversations/:id/close
 * @access  Private/Vendor
 */
exports.closeConversation = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const conversation = await db('conversations')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!conversation) throw new AppError('Conversation not found', 404);

    await db('conversations')
      .where('id', id)
      .update({ status: 'closed', updated_at: db.fn.now() });

    successResponse(res, null, 'Conversation closed successfully');
  } catch (error) {
    next(error);
  }
};
