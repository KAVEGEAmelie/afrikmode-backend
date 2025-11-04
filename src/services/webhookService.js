const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Service de gestion des webhooks
 */
class WebhookService {
  constructor() {
    this.webhooks = new Map(); // Stockage en mémoire pour les webhooks actifs
    this.eventTypes = {
      ORDER_CREATED: 'order.created',
      ORDER_UPDATED: 'order.updated',
      ORDER_CANCELLED: 'order.cancelled',
      ORDER_COMPLETED: 'order.completed',
      PRODUCT_CREATED: 'product.created',
      PRODUCT_UPDATED: 'product.updated',
      PRODUCT_DELETED: 'product.deleted',
      PRODUCT_OUT_OF_STOCK: 'product.out_of_stock',
      USER_REGISTERED: 'user.registered',
      USER_UPDATED: 'user.updated',
      PAYMENT_COMPLETED: 'payment.completed',
      PAYMENT_FAILED: 'payment.failed',
      REVIEW_CREATED: 'review.created',
      STORE_CREATED: 'store.created',
      STORE_UPDATED: 'store.updated'
    };
  }

  /**
   * Enregistre un nouveau webhook
   */
  async registerWebhook(webhookData, userId) {
    const {
      name,
      url,
      events,
      secret = null,
      is_active = true,
      headers = {}
    } = webhookData;

    // Valider l'URL
    if (!this.isValidUrl(url)) {
      throw new Error('URL webhook invalide');
    }

    // Valider les événements
    const validEvents = events.filter(event => 
      Object.values(this.eventTypes).includes(event)
    );

    if (validEvents.length === 0) {
      throw new Error('Au moins un événement valide est requis');
    }

    // Générer un secret si non fourni
    const webhookSecret = secret || this.generateSecret();

    // Enregistrer en base de données
    const [webhook] = await db('webhooks').insert({
      id: uuidv4(),
      name,
      url,
      events: JSON.stringify(validEvents),
      secret: webhookSecret,
      headers: JSON.stringify(headers),
      is_active,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Ajouter au cache en mémoire
    if (is_active) {
      this.addToCache(webhook);
    }

    return {
      ...webhook,
      events: JSON.parse(webhook.events),
      headers: JSON.parse(webhook.headers)
    };
  }

  /**
   * Met à jour un webhook
   */
  async updateWebhook(webhookId, updateData, userId) {
    const webhook = await db('webhooks')
      .where('id', webhookId)
      .where('created_by', userId)
      .first();

    if (!webhook) {
      throw new Error('Webhook non trouvé');
    }

    // Préparer les données de mise à jour
    const updates = { ...updateData, updated_at: new Date() };

    if (updateData.events) {
      const validEvents = updateData.events.filter(event => 
        Object.values(this.eventTypes).includes(event)
      );
      updates.events = JSON.stringify(validEvents);
    }

    if (updateData.headers) {
      updates.headers = JSON.stringify(updateData.headers);
    }

    // Mettre à jour en base
    const [updatedWebhook] = await db('webhooks')
      .where('id', webhookId)
      .update(updates)
      .returning('*');

    // Mettre à jour le cache
    this.removeFromCache(webhookId);
    if (updatedWebhook.is_active) {
      this.addToCache(updatedWebhook);
    }

    return {
      ...updatedWebhook,
      events: JSON.parse(updatedWebhook.events),
      headers: JSON.parse(updatedWebhook.headers)
    };
  }

  /**
   * Supprime un webhook
   */
  async deleteWebhook(webhookId, userId) {
    const deleted = await db('webhooks')
      .where('id', webhookId)
      .where('created_by', userId)
      .del();

    if (deleted) {
      this.removeFromCache(webhookId);
    }

    return deleted > 0;
  }

  /**
   * Récupère tous les webhooks d'un utilisateur
   */
  async getUserWebhooks(userId) {
    const webhooks = await db('webhooks')
      .where('created_by', userId)
      .orderBy('created_at', 'desc');

    return webhooks.map(webhook => ({
      ...webhook,
      events: JSON.parse(webhook.events),
      headers: JSON.parse(webhook.headers)
    }));
  }

  /**
   * Récupère un webhook spécifique
   */
  async getWebhook(webhookId, userId) {
    const webhook = await db('webhooks')
      .where('id', webhookId)
      .where('created_by', userId)
      .first();

    if (!webhook) {
      return null;
    }

    return {
      ...webhook,
      events: JSON.parse(webhook.events),
      headers: JSON.parse(webhook.headers)
    };
  }

  /**
   * Déclenche un webhook pour un événement
   */
  async triggerWebhooks(eventType, data, metadata = {}) {
    // Récupérer les webhooks actifs pour cet événement
    const activeWebhooks = await db('webhooks')
      .where('is_active', true)
      .where('events', 'like', `%"${eventType}"%`);

    if (activeWebhooks.length === 0) {
      console.log(`Aucun webhook actif pour l'événement: ${eventType}`);
      return;
    }

    const deliveryPromises = activeWebhooks.map(webhook => 
      this.deliverWebhook(webhook, eventType, data, metadata)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Livre un webhook spécifique
   */
  async deliverWebhook(webhook, eventType, data, metadata = {}) {
    try {
      const payload = {
        id: uuidv4(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
        data: data,
        metadata: metadata
      };

      // Générer la signature
      const signature = this.generateSignature(payload, webhook.secret);

      // Préparer les headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'AfrikMode-Webhook/1.0',
        'X-Webhook-Id': webhook.id,
        'X-Webhook-Event': eventType,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': payload.timestamp,
        ...JSON.parse(webhook.headers || '{}')
      };

      // Envoyer la requête
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        timeout: 10000 // 10 secondes
      });

      // Enregistrer la livraison
      await this.logWebhookDelivery({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: JSON.stringify(payload),
        response_status: response.status,
        response_body: await response.text().catch(() => ''),
        success: response.ok,
        delivered_at: new Date()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`Webhook livré avec succès: ${webhook.name} (${eventType})`);

    } catch (error) {
      console.error(`Erreur livraison webhook ${webhook.name}:`, error);

      // Enregistrer l'échec
      await this.logWebhookDelivery({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: JSON.stringify({ event_type: eventType, data, metadata }),
        response_status: 0,
        response_body: error.message,
        success: false,
        delivered_at: new Date()
      });

      // Désactiver le webhook après trop d'échecs consécutifs
      await this.handleFailedDelivery(webhook.id);
    }
  }

  /**
   * Enregistre une livraison de webhook
   */
  async logWebhookDelivery(deliveryData) {
    try {
      await db('webhook_deliveries').insert(deliveryData);
    } catch (error) {
      console.error('Erreur enregistrement livraison webhook:', error);
    }
  }

  /**
   * Gère les échecs de livraison
   */
  async handleFailedDelivery(webhookId) {
    const recentFailures = await db('webhook_deliveries')
      .where('webhook_id', webhookId)
      .where('success', false)
      .where('delivered_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Dernières 24h
      .count('* as count')
      .first();

    if (parseInt(recentFailures.count) >= 10) {
      // Désactiver le webhook après 10 échecs en 24h
      await db('webhooks')
        .where('id', webhookId)
        .update({ 
          is_active: false,
          updated_at: new Date()
        });

      this.removeFromCache(webhookId);
      
      console.log(`Webhook ${webhookId} désactivé après trop d'échecs`);
    }
  }

  /**
   * Récupère l'historique des livraisons
   */
  async getDeliveryHistory(webhookId, userId, limit = 50) {
    // Vérifier que l'utilisateur possède ce webhook
    const webhook = await this.getWebhook(webhookId, userId);
    if (!webhook) {
      throw new Error('Webhook non trouvé');
    }

    return await db('webhook_deliveries')
      .where('webhook_id', webhookId)
      .orderBy('delivered_at', 'desc')
      .limit(limit);
  }

  /**
   * Teste un webhook
   */
  async testWebhook(webhookId, userId) {
    const webhook = await this.getWebhook(webhookId, userId);
    if (!webhook) {
      throw new Error('Webhook non trouvé');
    }

    const testData = {
      test: true,
      message: 'Ceci est un test de webhook',
      timestamp: new Date().toISOString()
    };

    await this.deliverWebhook(webhook, 'test.webhook', testData);

    return {
      success: true,
      message: 'Test webhook envoyé'
    };
  }

  /**
   * Méthodes utilitaires
   */

  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  generateSignature(payload, secret) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  addToCache(webhook) {
    this.webhooks.set(webhook.id, {
      ...webhook,
      events: JSON.parse(webhook.events),
      headers: JSON.parse(webhook.headers)
    });
  }

  removeFromCache(webhookId) {
    this.webhooks.delete(webhookId);
  }

  /**
   * Initialise les webhooks depuis la base de données
   */
  async initializeWebhooks() {
    try {
      const activeWebhooks = await db('webhooks').where('is_active', true);
      
      activeWebhooks.forEach(webhook => {
        this.addToCache(webhook);
      });

      console.log(`${activeWebhooks.length} webhooks initialisés`);
    } catch (error) {
      console.error('Erreur initialisation webhooks:', error);
    }
  }

  /**
   * Nettoie l'historique ancien des livraisons
   */
  async cleanupDeliveryHistory() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deleted = await db('webhook_deliveries')
        .where('delivered_at', '<', thirtyDaysAgo)
        .del();

      console.log(`${deleted} anciennes livraisons webhook supprimées`);
    } catch (error) {
      console.error('Erreur nettoyage historique webhooks:', error);
    }
  }

  // Méthodes de déclenchement pour événements spécifiques

  async onOrderCreated(order) {
    await this.triggerWebhooks(this.eventTypes.ORDER_CREATED, order);
  }

  async onOrderUpdated(order, previousStatus) {
    const metadata = { previous_status: previousStatus };
    await this.triggerWebhooks(this.eventTypes.ORDER_UPDATED, order, metadata);
    
    if (order.status === 'cancelled') {
      await this.triggerWebhooks(this.eventTypes.ORDER_CANCELLED, order);
    } else if (order.status === 'delivered') {
      await this.triggerWebhooks(this.eventTypes.ORDER_COMPLETED, order);
    }
  }

  async onProductCreated(product) {
    await this.triggerWebhooks(this.eventTypes.PRODUCT_CREATED, product);
  }

  async onProductUpdated(product, changes) {
    const metadata = { changes };
    await this.triggerWebhooks(this.eventTypes.PRODUCT_UPDATED, product, metadata);
    
    if (product.stock_quantity <= 0) {
      await this.triggerWebhooks(this.eventTypes.PRODUCT_OUT_OF_STOCK, product);
    }
  }

  async onUserRegistered(user) {
    // Ne pas inclure d'informations sensibles
    const safeUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      created_at: user.created_at
    };
    
    await this.triggerWebhooks(this.eventTypes.USER_REGISTERED, safeUser);
  }

  async onPaymentCompleted(payment) {
    await this.triggerWebhooks(this.eventTypes.PAYMENT_COMPLETED, payment);
  }

  async onPaymentFailed(payment, error) {
    const metadata = { error_message: error };
    await this.triggerWebhooks(this.eventTypes.PAYMENT_FAILED, payment, metadata);
  }
}

module.exports = new WebhookService();