/**
 * Templates de notifications pour différents événements
 * Génère automatiquement le contenu des notifications selon l'événement
 */

class NotificationTemplates {

  /**
   * Template pour nouvelle commande
   */
  static newOrder(orderData, language = 'fr') {
    const templates = {
      fr: {
        title: '🛍️ Commande confirmée !',
        body: `Votre commande #${orderData.orderNumber} d'un montant de ${orderData.totalAmount} FCFA a été confirmée.`,
        category: 'order',
        type: 'order_confirmed',
        actionUrl: `/orders/${orderData.orderId}`,
        data: {
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount
        }
      },
      en: {
        title: '🛍️ Order confirmed!',
        body: `Your order #${orderData.orderNumber} for ${orderData.totalAmount} FCFA has been confirmed.`,
        category: 'order',
        type: 'order_confirmed',
        actionUrl: `/orders/${orderData.orderId}`,
        data: {
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour mise à jour du statut de commande
   */
  static orderStatusUpdate(orderData, language = 'fr') {
    const statusMessages = {
      fr: {
        processing: 'en cours de traitement',
        shipped: 'expédiée et en route',
        out_for_delivery: 'en cours de livraison',
        delivered: 'livrée avec succès',
        cancelled: 'annulée'
      },
      en: {
        processing: 'being processed',
        shipped: 'shipped and on the way',
        out_for_delivery: 'out for delivery',
        delivered: 'delivered successfully',
        cancelled: 'cancelled'
      }
    };

    const templates = {
      fr: {
        title: `📦 Commande ${statusMessages.fr[orderData.status]}`,
        body: `Votre commande #${orderData.orderNumber} est ${statusMessages.fr[orderData.status]}.`,
        category: 'order',
        type: 'order_status_update',
        actionUrl: `/orders/${orderData.orderId}`,
        priority: orderData.status === 'delivered' ? 'high' : 'normal'
      },
      en: {
        title: `📦 Order ${statusMessages.en[orderData.status]}`,
        body: `Your order #${orderData.orderNumber} is ${statusMessages.en[orderData.status]}.`,
        category: 'order',
        type: 'order_status_update',
        actionUrl: `/orders/${orderData.orderId}`,
        priority: orderData.status === 'delivered' ? 'high' : 'normal'
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour nouveau coupon disponible
   */
  static newCoupon(couponData, language = 'fr') {
    const templates = {
      fr: {
        title: '🎉 Nouveau coupon disponible !',
        body: `Profitez de ${couponData.discountText} avec le code ${couponData.code}. Valable jusqu'au ${couponData.expiryDate}.`,
        category: 'promotion',
        type: 'coupon_available',
        actionUrl: `/coupons/${couponData.couponId}`,
        priority: 'high',
        imageUrl: couponData.imageUrl,
        data: {
          couponId: couponData.couponId,
          code: couponData.code,
          discountValue: couponData.discountValue
        }
      },
      en: {
        title: '🎉 New coupon available!',
        body: `Get ${couponData.discountText} with code ${couponData.code}. Valid until ${couponData.expiryDate}.`,
        category: 'promotion',
        type: 'coupon_available',
        actionUrl: `/coupons/${couponData.couponId}`,
        priority: 'high',
        imageUrl: couponData.imageUrl,
        data: {
          couponId: couponData.couponId,
          code: couponData.code,
          discountValue: couponData.discountValue
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour coupon expirant bientôt
   */
  static couponExpiring(couponData, language = 'fr') {
    const templates = {
      fr: {
        title: '⏰ Coupon expirant bientôt !',
        body: `Votre coupon ${couponData.code} expire ${couponData.timeLeft}. Utilisez-le maintenant !`,
        category: 'promotion',
        type: 'coupon_expiring',
        actionUrl: `/shop?coupon=${couponData.code}`,
        priority: 'urgent',
        data: {
          couponId: couponData.couponId,
          code: couponData.code
        }
      },
      en: {
        title: '⏰ Coupon expiring soon!',
        body: `Your coupon ${couponData.code} expires ${couponData.timeLeft}. Use it now!`,
        category: 'promotion',
        type: 'coupon_expiring',
        actionUrl: `/shop?coupon=${couponData.code}`,
        priority: 'urgent',
        data: {
          couponId: couponData.couponId,
          code: couponData.code
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour nouveau produit disponible
   */
  static newProduct(productData, language = 'fr') {
    const templates = {
      fr: {
        title: '✨ Nouveau produit disponible !',
        body: `Découvrez ${productData.name} à partir de ${productData.price} FCFA. Nouvelle collection ${productData.category}.`,
        category: 'product',
        type: 'new_product',
        actionUrl: `/products/${productData.productId}`,
        priority: 'normal',
        imageUrl: productData.imageUrl,
        data: {
          productId: productData.productId,
          categoryId: productData.categoryId
        }
      },
      en: {
        title: '✨ New product available!',
        body: `Discover ${productData.name} from ${productData.price} FCFA. New ${productData.category} collection.`,
        category: 'product',
        type: 'new_product',
        actionUrl: `/products/${productData.productId}`,
        priority: 'normal',
        imageUrl: productData.imageUrl,
        data: {
          productId: productData.productId,
          categoryId: productData.categoryId
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour produit en rupture de stock remis disponible
   */
  static productBackInStock(productData, language = 'fr') {
    const templates = {
      fr: {
        title: '🔄 Produit de nouveau disponible !',
        body: `${productData.name} est de nouveau en stock ! Ne le ratez pas cette fois.`,
        category: 'product',
        type: 'back_in_stock',
        actionUrl: `/products/${productData.productId}`,
        priority: 'high',
        imageUrl: productData.imageUrl,
        data: {
          productId: productData.productId,
          previouslyWishlisted: productData.wasInWishlist
        }
      },
      en: {
        title: '🔄 Product back in stock!',
        body: `${productData.name} is back in stock! Don't miss it this time.`,
        category: 'product',
        type: 'back_in_stock',
        actionUrl: `/products/${productData.productId}`,
        priority: 'high',
        imageUrl: productData.imageUrl,
        data: {
          productId: productData.productId,
          previouslyWishlisted: productData.wasInWishlist
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour produit en promotion
   */
  static productOnSale(productData, language = 'fr') {
    const templates = {
      fr: {
        title: '🔥 Promotion exceptionnelle !',
        body: `${productData.name} à ${productData.salePrice} FCFA au lieu de ${productData.originalPrice} FCFA (-${productData.discountPercent}%) !`,
        category: 'promotion',
        type: 'product_sale',
        actionUrl: `/products/${productData.productId}`,
        priority: 'high',
        imageUrl: productData.imageUrl,
        data: {
          productId: productData.productId,
          originalPrice: productData.originalPrice,
          salePrice: productData.salePrice,
          discountPercent: productData.discountPercent
        }
      },
      en: {
        title: '🔥 Exceptional sale!',
        body: `${productData.name} at ${productData.salePrice} FCFA instead of ${productData.originalPrice} FCFA (-${productData.discountPercent}%)!`,
        category: 'promotion',
        type: 'product_sale',
        actionUrl: `/products/${productData.productId}`,
        priority: 'high',
        imageUrl: productData.imageUrl,
        data: {
          productId: productData.productId,
          originalPrice: productData.originalPrice,
          salePrice: productData.salePrice,
          discountPercent: productData.discountPercent
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour abandon de panier
   */
  static cartAbandonment(cartData, language = 'fr') {
    const templates = {
      fr: {
        title: '🛒 Votre panier vous attend !',
        body: `Vous avez oublié ${cartData.itemCount} article(s) dans votre panier. Terminez votre achat maintenant !`,
        category: 'cart',
        type: 'cart_abandonment',
        actionUrl: '/cart',
        priority: 'normal',
        data: {
          cartId: cartData.cartId,
          itemCount: cartData.itemCount,
          totalAmount: cartData.totalAmount
        }
      },
      en: {
        title: '🛒 Your cart is waiting!',
        body: `You forgot ${cartData.itemCount} item(s) in your cart. Complete your purchase now!`,
        category: 'cart',
        type: 'cart_abandonment',
        actionUrl: '/cart',
        priority: 'normal',
        data: {
          cartId: cartData.cartId,
          itemCount: cartData.itemCount,
          totalAmount: cartData.totalAmount
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour paiement échoué
   */
  static paymentFailed(paymentData, language = 'fr') {
    const templates = {
      fr: {
        title: '❌ Paiement échoué',
        body: `Le paiement de ${paymentData.amount} FCFA pour votre commande #${paymentData.orderNumber} a échoué. Réessayez maintenant.`,
        category: 'payment',
        type: 'payment_failed',
        actionUrl: `/orders/${paymentData.orderId}/retry-payment`,
        priority: 'urgent',
        data: {
          orderId: paymentData.orderId,
          paymentId: paymentData.paymentId,
          amount: paymentData.amount
        }
      },
      en: {
        title: '❌ Payment failed',
        body: `Payment of ${paymentData.amount} FCFA for your order #${paymentData.orderNumber} failed. Try again now.`,
        category: 'payment',
        type: 'payment_failed',
        actionUrl: `/orders/${paymentData.orderId}/retry-payment`,
        priority: 'urgent',
        data: {
          orderId: paymentData.orderId,
          paymentId: paymentData.paymentId,
          amount: paymentData.amount
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour paiement réussi
   */
  static paymentSuccess(paymentData, language = 'fr') {
    const templates = {
      fr: {
        title: '✅ Paiement confirmé !',
        body: `Votre paiement de ${paymentData.amount} FCFA a été confirmé. Merci pour votre achat !`,
        category: 'payment',
        type: 'payment_success',
        actionUrl: `/orders/${paymentData.orderId}`,
        priority: 'high',
        data: {
          orderId: paymentData.orderId,
          paymentId: paymentData.paymentId,
          amount: paymentData.amount
        }
      },
      en: {
        title: '✅ Payment confirmed!',
        body: `Your payment of ${paymentData.amount} FCFA has been confirmed. Thank you for your purchase!`,
        category: 'payment',
        type: 'payment_success',
        actionUrl: `/orders/${paymentData.orderId}`,
        priority: 'high',
        data: {
          orderId: paymentData.orderId,
          paymentId: paymentData.paymentId,
          amount: paymentData.amount
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour demander un avis sur produit
   */
  static reviewRequest(orderData, language = 'fr') {
    const templates = {
      fr: {
        title: '⭐ Donnez votre avis !',
        body: `Comment avez-vous trouvé vos derniers achats ? Partagez votre expérience avec nous.`,
        category: 'review',
        type: 'review_request',
        actionUrl: `/orders/${orderData.orderId}/review`,
        priority: 'low',
        data: {
          orderId: orderData.orderId
        }
      },
      en: {
        title: '⭐ Share your review!',
        body: `How did you like your recent purchases? Share your experience with us.`,
        category: 'review',
        type: 'review_request',
        actionUrl: `/orders/${orderData.orderId}/review`,
        priority: 'low',
        data: {
          orderId: orderData.orderId
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour bienvenue utilisateur
   */
  static welcome(userData, language = 'fr') {
    const templates = {
      fr: {
        title: `🎉 Bienvenue ${userData.firstName} !`,
        body: `Merci de rejoindre AfrikMode ! Découvrez nos collections exclusives et profitez de 10% de réduction sur votre première commande.`,
        category: 'welcome',
        type: 'user_welcome',
        actionUrl: '/shop?welcome=true',
        priority: 'high',
        data: {
          isFirstTime: true,
          welcomeDiscount: '10%'
        }
      },
      en: {
        title: `🎉 Welcome ${userData.firstName}!`,
        body: `Thank you for joining AfrikMode! Discover our exclusive collections and enjoy 10% off your first order.`,
        category: 'welcome',
        type: 'user_welcome',
        actionUrl: '/shop?welcome=true',
        priority: 'high',
        data: {
          isFirstTime: true,
          welcomeDiscount: '10%'
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Template pour événement spécial
   */
  static specialEvent(eventData, language = 'fr') {
    const templates = {
      fr: {
        title: `🎊 ${eventData.title}`,
        body: eventData.description,
        category: 'event',
        type: 'special_event',
        actionUrl: eventData.actionUrl,
        priority: 'urgent',
        imageUrl: eventData.imageUrl,
        data: {
          eventId: eventData.eventId,
          eventType: eventData.type,
          startDate: eventData.startDate,
          endDate: eventData.endDate
        }
      },
      en: {
        title: `🎊 ${eventData.title}`,
        body: eventData.description,
        category: 'event',
        type: 'special_event',
        actionUrl: eventData.actionUrl,
        priority: 'urgent',
        imageUrl: eventData.imageUrl,
        data: {
          eventId: eventData.eventId,
          eventType: eventData.type,
          startDate: eventData.startDate,
          endDate: eventData.endDate
        }
      }
    };

    return templates[language] || templates.fr;
  }

  /**
   * Générer une notification selon le type d'événement
   */
  static generate(type, data, language = 'fr') {
    const generators = {
      'order_confirmed': this.newOrder,
      'order_status_update': this.orderStatusUpdate,
      'coupon_available': this.newCoupon,
      'coupon_expiring': this.couponExpiring,
      'new_product': this.newProduct,
      'back_in_stock': this.productBackInStock,
      'product_sale': this.productOnSale,
      'cart_abandonment': this.cartAbandonment,
      'payment_failed': this.paymentFailed,
      'payment_success': this.paymentSuccess,
      'review_request': this.reviewRequest,
      'user_welcome': this.welcome,
      'special_event': this.specialEvent
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Type de notification non supporté: ${type}`);
    }

    return generator(data, language);
  }
}

module.exports = NotificationTemplates;