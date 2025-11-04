/**
 * Helpers pour les notifications
 */

const notificationService = require('./notificationService');

class NotificationHelpers {

  /**
   * Envoyer une notification de bienvenue
   */
  static async sendWelcomeNotification(user) {
    try {
      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'welcome',
        title: 'Bienvenue sur AfrikMode ! 🎉',
        body: `Bonjour ${user.first_name}, découvrez nos magnifiques collections africaines`,
        category: 'welcome',
        priority: 'normal',
        data: {
          action: 'welcome',
          userId: user.id
        },
        actionUrl: '/welcome',
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification de bienvenue:', error);
    }
  }

  /**
   * Envoyer une notification de commande
   */
  static async sendOrderNotification(user, order, type) {
    try {
      const notifications = {
        created: {
          title: 'Commande confirmée ! 📦',
          body: `Votre commande #${order.order_number} a été confirmée`
        },
        shipped: {
          title: 'Commande expédiée ! 🚚',
          body: `Votre commande #${order.order_number} est en route`
        },
        delivered: {
          title: 'Commande livrée ! ✅',
          body: `Votre commande #${order.order_number} a été livrée`
        },
        cancelled: {
          title: 'Commande annulée ❌',
          body: `Votre commande #${order.order_number} a été annulée`
        }
      };

      const notification = notifications[type];
      if (!notification) return;

      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'order',
        title: notification.title,
        body: notification.body,
        category: 'order',
        priority: 'high',
        data: {
          action: 'order',
          orderId: order.id,
          orderNumber: order.order_number,
          type: type
        },
        actionUrl: `/orders/${order.id}`,
        relatedOrderId: order.id,
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification de commande:', error);
    }
  }

  /**
   * Envoyer une notification de paiement
   */
  static async sendPaymentNotification(user, payment, type) {
    try {
      const notifications = {
        success: {
          title: 'Paiement réussi ! 💳',
          body: `Votre paiement de ${payment.amount} FCFA a été traité`
        },
        failed: {
          title: 'Paiement échoué ❌',
          body: `Votre paiement de ${payment.amount} FCFA a échoué`
        },
        refunded: {
          title: 'Remboursement effectué 💰',
          body: `Votre remboursement de ${payment.amount} FCFA a été traité`
        }
      };

      const notification = notifications[type];
      if (!notification) return;

      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'payment',
        title: notification.title,
        body: notification.body,
        category: 'payment',
        priority: 'high',
        data: {
          action: 'payment',
          paymentId: payment.id,
          amount: payment.amount,
          type: type
        },
        actionUrl: `/payments/${payment.id}`,
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification de paiement:', error);
    }
  }

  /**
   * Envoyer une notification de promotion
   */
  static async sendPromotionNotification(user, promotion) {
    try {
      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'promotion',
        title: 'Nouvelle promotion ! 🎁',
        body: `${promotion.title} - ${promotion.description}`,
        category: 'promotion',
        priority: 'normal',
        data: {
          action: 'promotion',
          promotionId: promotion.id,
          discount: promotion.discount
        },
        actionUrl: `/promotions/${promotion.id}`,
        relatedCouponId: promotion.id,
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification de promotion:', error);
    }
  }

  /**
   * Envoyer une notification de support
   */
  static async sendSupportNotification(user, ticket, type) {
    try {
      const notifications = {
        created: {
          title: 'Ticket de support créé 📝',
          body: `Votre ticket #${ticket.ticket_number} a été créé`
        },
        updated: {
          title: 'Réponse à votre ticket 💬',
          body: `Nouvelle réponse pour le ticket #${ticket.ticket_number}`
        },
        resolved: {
          title: 'Ticket résolu ✅',
          body: `Votre ticket #${ticket.ticket_number} a été résolu`
        }
      };

      const notification = notifications[type];
      if (!notification) return;

      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'support',
        title: notification.title,
        body: notification.body,
        category: 'support',
        priority: 'normal',
        data: {
          action: 'support',
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          type: type
        },
        actionUrl: `/support/tickets/${ticket.id}`,
        relatedTicketId: ticket.id,
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification de support:', error);
    }
  }

  /**
   * Envoyer une notification de stock faible
   */
  static async sendLowStockNotification(vendor, product) {
    try {
      await notificationService.sendPushNotification({
        userId: vendor.id,
        type: 'inventory',
        title: 'Stock faible ! ⚠️',
        body: `Le produit "${product.name}" a un stock faible (${product.stock_quantity} restants)`,
        category: 'inventory',
        priority: 'high',
        data: {
          action: 'inventory',
          productId: product.id,
          stockQuantity: product.stock_quantity
        },
        actionUrl: `/products/${product.id}`,
        relatedProductId: product.id,
        tenantId: vendor.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification de stock:', error);
    }
  }

  /**
   * Envoyer une notification de nouvelle commande (pour les vendeurs)
   */
  static async sendNewOrderNotification(vendor, order) {
    try {
      await notificationService.sendPushNotification({
        userId: vendor.id,
        type: 'vendor_order',
        title: 'Nouvelle commande ! 🛍️',
        body: `Nouvelle commande #${order.order_number} reçue`,
        category: 'vendor',
        priority: 'high',
        data: {
          action: 'vendor_order',
          orderId: order.id,
          orderNumber: order.order_number,
          totalAmount: order.total_amount
        },
        actionUrl: `/vendor/orders/${order.id}`,
        relatedOrderId: order.id,
        tenantId: vendor.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification nouvelle commande vendeur:', error);
    }
  }

  /**
   * Envoyer une notification de newsletter
   */
  static async sendNewsletterNotification(user, newsletter) {
    try {
      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'newsletter',
        title: newsletter.title,
        body: newsletter.excerpt || 'Nouvelle newsletter disponible',
        category: 'newsletter',
        priority: 'low',
        data: {
          action: 'newsletter',
          newsletterId: newsletter.id
        },
        actionUrl: `/newsletter/${newsletter.id}`,
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification newsletter:', error);
    }
  }

  /**
   * Envoyer une notification de système
   */
  static async sendSystemNotification(user, title, message, priority = 'normal') {
    try {
      await notificationService.sendPushNotification({
        userId: user.id,
        type: 'system',
        title: title,
        body: message,
        category: 'system',
        priority: priority,
        data: {
          action: 'system'
        },
        tenantId: user.tenant_id
      });
    } catch (error) {
      console.error('Erreur notification système:', error);
    }
  }
}

module.exports = NotificationHelpers;