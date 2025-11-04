/**
 * Seeds pour les device tokens et notifications de test
 * Génère des données d'exemple pour le développement et les tests
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  try {
    // Récupérer quelques utilisateurs existants
    const users = await knex('users').select('id', 'tenant_id').limit(3);
    
    if (users.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé pour créer des device tokens');
      return;
    }

    // Nettoyer les tables
    await knex('notifications').del();
    await knex('device_tokens').del();

    console.log('🧹 Tables notifications nettoyées');

    // Device tokens de test
    const deviceTokens = [
      {
        id: uuidv4(),
        user_id: users[0].id,
        token: 'fcm_test_token_android_user1_' + Date.now(),
        token_type: 'fcm',
        device_id: 'android_device_001',
        platform: 'android',
        app_version: '1.0.0',
        device_model: 'Samsung Galaxy S21',
        os_version: 'Android 12',
        language: 'fr',
        notifications_enabled: true,
        notification_preferences: JSON.stringify({
          orders: true,
          promotions: true,
          products: true,
          general: true,
          marketing: false
        }),
        timezone: 'Africa/Lome',
        location_data: JSON.stringify({
          country: 'TG',
          city: 'Lomé',
          latitude: 6.1319,
          longitude: 1.2228
        }),
        is_active: true,
        tenant_id: users[0].tenant_id,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: users[0].id,
        token: 'fcm_test_token_ios_user1_' + Date.now(),
        token_type: 'fcm',
        device_id: 'ios_device_001',
        platform: 'ios',
        app_version: '1.0.0',
        device_model: 'iPhone 13',
        os_version: 'iOS 15.5',
        language: 'fr',
        notifications_enabled: true,
        notification_preferences: JSON.stringify({
          orders: true,
          promotions: true,
          products: false,
          general: true,
          marketing: true
        }),
        timezone: 'Africa/Lome',
        location_data: JSON.stringify({
          country: 'TG',
          city: 'Lomé',
          latitude: 6.1319,
          longitude: 1.2228
        }),
        is_active: true,
        tenant_id: users[0].tenant_id,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Ajouter des tokens pour les autres utilisateurs si disponibles
    if (users.length > 1) {
      deviceTokens.push({
        id: uuidv4(),
        user_id: users[1].id,
        token: 'onesignal_test_token_web_user2_' + Date.now(),
        token_type: 'onesignal',
        device_id: 'web_device_002',
        platform: 'web',
        app_version: '1.0.0',
        device_model: 'Chrome Browser',
        os_version: 'Windows 11',
        language: 'en',
        notifications_enabled: true,
        notification_preferences: JSON.stringify({
          orders: true,
          promotions: false,
          products: true,
          general: true,
          marketing: false
        }),
        timezone: 'Africa/Abidjan',
        location_data: JSON.stringify({
          country: 'CI',
          city: 'Abidjan',
          latitude: 5.3364,
          longitude: -4.0267
        }),
        is_active: true,
        tenant_id: users[1].tenant_id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    if (users.length > 2) {
      deviceTokens.push({
        id: uuidv4(),
        user_id: users[2].id,
        token: 'fcm_test_token_android_user3_' + Date.now(),
        token_type: 'fcm',
        device_id: 'android_device_003',
        platform: 'android',
        app_version: '1.0.1',
        device_model: 'Google Pixel 6',
        os_version: 'Android 13',
        language: 'fr',
        notifications_enabled: false, // Notifications désactivées
        notification_preferences: JSON.stringify({
          orders: false,
          promotions: false,
          products: false,
          general: false,
          marketing: false
        }),
        timezone: 'Africa/Dakar',
        location_data: JSON.stringify({
          country: 'SN',
          city: 'Dakar',
          latitude: 14.6928,
          longitude: -17.4467
        }),
        is_active: false,
        tenant_id: users[2].tenant_id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    await knex('device_tokens').insert(deviceTokens);
    console.log(`✅ ${deviceTokens.length} device tokens créés`);

    // Notifications de test
    const notifications = [
      {
        id: uuidv4(),
        user_id: users[0].id,
        type: 'order_confirmed',
        title: '🛍️ Commande confirmée !',
        body: 'Votre commande #ORD-001 d\'un montant de 25000 FCFA a été confirmée.',
        data: JSON.stringify({
          orderId: uuidv4(),
          orderNumber: 'ORD-001',
          totalAmount: 25000
        }),
        category: 'order',
        priority: 'high',
        image_url: null,
        icon_url: null,
        sound: 'default',
        display_options: JSON.stringify({}),
        action_url: '/orders/test-order-1',
        actions: JSON.stringify([]),
        scheduled_at: null,
        expires_at: null,
        is_scheduled: false,
        status: 'delivered',
        sent_at: new Date(),
        delivered_at: new Date(),
        read_at: null,
        clicked: false,
        click_count: 0,
        target_criteria: JSON.stringify({}),
        delivery_details: JSON.stringify({
          platform: 'firebase',
          success: true
        }),
        interaction_data: JSON.stringify({}),
        campaign_id: null,
        batch_id: null,
        related_order_id: null,
        related_product_id: null,
        related_coupon_id: null,
        related_ticket_id: null,
        tenant_id: users[0].tenant_id,
        created_by: 'system',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2 heures
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        user_id: users[0].id,
        type: 'coupon_available',
        title: '🎉 Nouveau coupon disponible !',
        body: 'Profitez de 15% de réduction avec le code WELCOME15. Valable jusqu\'au 31/12/2024.',
        data: JSON.stringify({
          couponId: uuidv4(),
          code: 'WELCOME15',
          discountValue: 15
        }),
        category: 'promotion',
        priority: 'high',
        image_url: '/images/coupons/welcome15.png',
        icon_url: '/images/icons/coupon.png',
        sound: 'promotion',
        display_options: JSON.stringify({
          showImage: true,
          vibrate: true
        }),
        action_url: '/coupons/welcome15',
        actions: JSON.stringify([
          {
            id: 'use_now',
            text: 'Utiliser maintenant',
            url: '/shop?coupon=WELCOME15'
          }
        ]),
        scheduled_at: null,
        expires_at: new Date('2024-12-31'),
        is_scheduled: false,
        status: 'read',
        sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Il y a 1 jour
        delivered_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        read_at: new Date(Date.now() - 23 * 60 * 60 * 1000),
        clicked: true,
        click_count: 2,
        target_criteria: JSON.stringify({}),
        delivery_details: JSON.stringify({
          platform: 'firebase',
          success: true,
          messageId: 'fcm_msg_123456'
        }),
        interaction_data: JSON.stringify({
          firstClickAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
          lastClickAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        }),
        campaign_id: 'welcome_campaign_2024',
        batch_id: null,
        related_order_id: null,
        related_product_id: null,
        related_coupon_id: null,
        related_ticket_id: null,
        tenant_id: users[0].tenant_id,
        created_by: 'admin',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: uuidv4(),
        user_id: users[0].id,
        type: 'new_product',
        title: '✨ Nouveau produit disponible !',
        body: 'Découvrez la nouvelle Robe Kente Premium à partir de 45000 FCFA. Nouvelle collection Mode Africaine.',
        data: JSON.stringify({
          productId: uuidv4(),
          categoryId: uuidv4()
        }),
        category: 'product',
        priority: 'normal',
        image_url: '/images/products/robe-kente-premium.jpg',
        icon_url: '/images/icons/new-product.png',
        sound: 'default',
        display_options: JSON.stringify({
          showImage: true,
          requireInteraction: false
        }),
        action_url: '/products/robe-kente-premium',
        actions: JSON.stringify([]),
        scheduled_at: null,
        expires_at: null,
        is_scheduled: false,
        status: 'sent',
        sent_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // Il y a 6 heures
        delivered_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
        read_at: null,
        clicked: false,
        click_count: 0,
        target_criteria: JSON.stringify({
          category: 'Mode Africaine',
          userSegment: 'fashion_lovers'
        }),
        delivery_details: JSON.stringify({
          platform: 'firebase',
          success: true,
          recipients: 1
        }),
        interaction_data: JSON.stringify({}),
        campaign_id: 'new_products_2024',
        batch_id: uuidv4(),
        related_order_id: null,
        related_product_id: null,
        related_coupon_id: null,
        related_ticket_id: null,
        tenant_id: users[0].tenant_id,
        created_by: 'system',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ];

    // Ajouter des notifications pour les autres utilisateurs
    if (users.length > 1) {
      notifications.push({
        id: uuidv4(),
        user_id: users[1].id,
        type: 'user_welcome',
        title: `🎉 Bienvenue sur AfrikMode !`,
        body: 'Merci de rejoindre AfrikMode ! Découvrez nos collections exclusives et profitez de 10% de réduction sur votre première commande.',
        data: JSON.stringify({
          isFirstTime: true,
          welcomeDiscount: '10%'
        }),
        category: 'welcome',
        priority: 'high',
        image_url: '/images/welcome/banner.jpg',
        icon_url: '/images/icons/welcome.png',
        sound: 'welcome',
        display_options: JSON.stringify({
          showImage: true,
          vibrate: true,
          requireInteraction: true
        }),
        action_url: '/shop?welcome=true',
        actions: JSON.stringify([
          {
            id: 'start_shopping',
            text: 'Commencer mes achats',
            url: '/shop'
          }
        ]),
        scheduled_at: null,
        expires_at: null,
        is_scheduled: false,
        status: 'delivered',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Il y a 3 jours
        delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        read_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        clicked: true,
        click_count: 1,
        target_criteria: JSON.stringify({}),
        delivery_details: JSON.stringify({
          platform: 'onesignal',
          success: true,
          playerId: 'test_player_id_123'
        }),
        interaction_data: JSON.stringify({
          firstClickAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }),
        campaign_id: 'welcome_campaign_2024',
        batch_id: null,
        related_order_id: null,
        related_product_id: null,
        related_coupon_id: null,
        related_ticket_id: null,
        tenant_id: users[1].tenant_id,
        created_by: 'system',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      });
    }

    // Notification planifiée
    notifications.push({
      id: uuidv4(),
      user_id: users[0].id,
      type: 'special_event',
      title: '🎊 Vente Flash ce weekend !',
      body: 'Préparez-vous ! Vente flash exceptionnelle ce weekend avec jusqu\'à 50% de réduction sur toute la collection.',
      data: JSON.stringify({
        eventId: uuidv4(),
        eventType: 'flash_sale',
        startDate: '2024-12-28T00:00:00Z',
        endDate: '2024-12-29T23:59:59Z'
      }),
      category: 'event',
      priority: 'urgent',
      image_url: '/images/events/flash-sale-weekend.jpg',
      icon_url: '/images/icons/flash-sale.png',
      sound: 'urgent',
      display_options: JSON.stringify({
        showImage: true,
        vibrate: true,
        requireInteraction: true
      }),
      action_url: '/events/flash-sale-weekend',
      actions: JSON.stringify([
        {
          id: 'view_deals',
          text: 'Voir les offres',
          url: '/shop?event=flash-sale'
        },
        {
          id: 'remind_later',
          text: 'Me rappeler',
          url: '/reminders/flash-sale'
        }
      ]),
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
      expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // Dans 4 jours
      is_scheduled: true,
      status: 'scheduled',
      sent_at: null,
      delivered_at: null,
      read_at: null,
      clicked: false,
      click_count: 0,
      target_criteria: JSON.stringify({
        platform: 'all',
        userRoles: ['customer'],
        lastActiveAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }),
      delivery_details: JSON.stringify({}),
      interaction_data: JSON.stringify({}),
      campaign_id: 'flash_sale_december_2024',
      batch_id: uuidv4(),
      related_order_id: null,
      related_product_id: null,
      related_coupon_id: null,
      related_ticket_id: null,
      tenant_id: users[0].tenant_id,
      created_by: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    });

    await knex('notifications').insert(notifications);
    console.log(`✅ ${notifications.length} notifications de test créées`);

    console.log('\n🎯 Résumé des données créées:');
    console.log(`   • Device tokens: ${deviceTokens.length}`);
    console.log(`   • Notifications: ${notifications.length}`);
    console.log(`   • Utilisateurs avec tokens: ${users.length}`);
    
    // Statistiques par statut
    const statusCounts = notifications.reduce((acc, notif) => {
      acc[notif.status] = (acc[notif.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`   • Statuts des notifications:`, statusCounts);

    // Statistiques par catégorie
    const categoryCounts = notifications.reduce((acc, notif) => {
      acc[notif.category] = (acc[notif.category] || 0) + 1;
      return acc;
    }, {});
    console.log(`   • Catégories:`, categoryCounts);

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des seeds notifications:', error);
    throw error;
  }
};