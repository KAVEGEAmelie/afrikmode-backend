const express = require('express');
const router = express.Router();
const vendorMessageController = require('../../controllers/vendor/vendorMessageController');
const { requireAuth, requireVendorRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireVendorRole);

router.get('/conversations', vendorMessageController.getConversations);
router.get('/conversations/:id', vendorMessageController.getConversationMessages);
router.post('/conversations/:id/send', vendorMessageController.sendMessage);
router.patch('/conversations/:id/read', vendorMessageController.markAsRead);
router.patch('/conversations/:id/close', vendorMessageController.closeConversation);
router.get('/unread-count', vendorMessageController.getUnreadCount);

module.exports = router;
