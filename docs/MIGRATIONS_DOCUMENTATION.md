# Documentation des Migrations - TheSyMo Platform

## 📋 Vue d'ensemble

Ce document récapitule toutes les migrations de la base de données de la plateforme TheSyMo (AfrikMode). Les migrations sont organisées par ordre chronologique et regroupées par fonctionnalité.

---

## 🗂️ Tables Principales

### 1. Migration de la table « users » (Utilisateurs)
**Fichier**: `20250926134023_create_users_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `email`, `password_hash`
- **Informations personnelles**: `first_name`, `last_name`, `phone`, `birth_date`, `gender`
- **Profil**: `avatar_url`, `bio`, `preferred_language`, `preferred_currency`
- **Adresse**: `country`, `city`, `address`, `postal_code`
- **Rôle et statut**: `role` (customer/vendor/admin), `status` (pending/active/suspended/banned)
- **Vérifications**: `email_verified`, `phone_verified`
- **Authentification**: `email_verification_token`, `password_reset_token`, `two_factor_secret`, `two_factor_enabled`
- **Système de fidélité**: `loyalty_points`, `loyalty_tier` (bronze/silver/gold/platinum)
- **Préférences marketing**: `marketing_emails`, `marketing_sms`, `order_notifications`
- **Multi-tenant**: `tenant_id`
- **Audit**: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`, `deleted_by`

#### Index:
- `email`, `role`, `status`, `tenant_id`, `created_at`, `deleted_at`

---

### 2. Migration de la table « stores » (Boutiques/Vendeurs)
**Fichier**: `20250926134322_002_create_stores_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `name`, `slug`, `owner_id`
- **Description**: `description`, `short_description`
- **Configuration visuelle**: `logo_url`, `banner_url`, `theme_color`, `brand_colors`
- **Contact**: `email`, `phone`, `whatsapp`, `website`, `social_links`
- **Adresse**: `country`, `region`, `city`, `address`, `postal_code`, `latitude`, `longitude`
- **Business**: `business_registration_number`, `tax_number`, `business_type`
- **Statut**: `status` (pending/active/suspended/closed), `is_verified`, `featured`
- **Commission**: `commission_rate` (%)
- **Politiques**: `return_policy`, `shipping_policy`, `privacy_policy`, `terms_conditions`
- **Multi-langue**: `translations`, `default_language`, `supported_languages`
- **Paiement**: `default_currency`, `accepted_currencies`, `payment_methods`
- **Analytics**: `total_orders`, `total_revenue`, `average_rating`, `total_reviews`, `total_products`, `followers_count`
- **SEO**: `meta_title`, `meta_description`, `meta_keywords`
- **Horaires**: `opening_hours`, `timezone`

#### Relations:
- **Foreign Key**: `owner_id` → `users(id)`

#### Index:
- `owner_id`, `slug`, `status`, `country`, `city`, `featured`, `is_verified`, `tenant_id`

---

### 3. Migration de la table « categories » (Catégories)
**Fichier**: `20250926134330_003_create_categories_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `name`, `slug`
- **Description**: `description`, `image_url`, `icon`
- **Hiérarchie**: `parent_id` (auto-référence), `level`, `path`, `sort_order`
- **Paramètres**: `is_active`, `featured`, `show_in_menu`
- **SEO**: `meta_title`, `meta_description`, `meta_keywords`
- **Multi-langue**: `translations`
- **Analytics**: `products_count`, `views_count`
- **Boutique**: `store_id` (optionnel - pour catégories spécifiques à une boutique)

#### Relations:
- **Self-reference**: `parent_id` → `categories(id)`
- **Foreign Key**: `store_id` → `stores(id)`

#### Index:
- `slug`, `parent_id`, `level`, `path`, `is_active`, `featured`, `store_id`

#### Contraintes:
- **Unique**: `(slug, tenant_id)`

---

### 4. Migration de la table « products » (Produits)
**Fichier**: `20250926134338_004_create_products_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `name`, `slug`, `sku`, `barcode`
- **Associations**: `store_id`, `category_id`
- **Prix**: `price`, `compare_at_price`, `cost_price`, `currency`
- **Spécificités Mode Africaine**:
  - `fabric_type` (Wax, Kente, Bogolan, etc.)
  - `fabric_origin` (Ghana, Nigeria, Mali, etc.)
  - `cultural_significance` (JSON)
  - `care_instructions`
- **Attributs physiques**: 
  - `dimensions` (JSON), `weight`
  - `colors_available` (JSON), `sizes_available` (JSON)
  - `materials` (JSON)
- **Gestion stock**:
  - `stock_quantity`, `reserved_quantity`, `low_stock_threshold`
  - `track_inventory`, `allow_backorders`
- **Statut**: `status` (draft/active/inactive/out_of_stock), `featured`, `customizable`
- **Médias**: `images` (JSON), `videos` (JSON), `primary_image`
- **Livraison**: `requires_shipping`, `shipping_weight`, `shipping_dimensions`, `fragile`
- **SEO**: `meta_title`, `meta_description`, `meta_keywords`
- **Multi-langue**: `translations`
- **Analytics**: `views_count`, `sales_count`, `total_revenue`, `average_rating`, `reviews_count`, `wishlist_count`
- **Artisan**: `artisan_name`, `artisan_story`, `artisan_location`
- **Flexibilité**: `attributes` (JSON), `variants` (JSON)
- **Saisonnalité**: `seasons` (JSON), `occasions` (JSON), `tags` (JSON)

#### Relations:
- **Foreign Keys**: 
  - `store_id` → `stores(id)`
  - `category_id` → `categories(id)`

#### Index:
- `store_id`, `category_id`, `slug`, `sku`, `status`, `featured`, `price`, `stock_quantity`, `fabric_type`
- **Full-text search**: Index GIN sur `name` + `description`

#### Contraintes:
- **Unique**: `(slug, store_id)`, `(sku, store_id)`

---

### 5. Migration de la table « user_addresses » (Adresses)
**Fichier**: `20251027182923_create_user_addresses_table.js`  
**Date**: 27 octobre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `user_id`
- **Contact**: `first_name`, `last_name`, `phone`, `email`
- **Adresse**: 
  - `address_line_1`, `address_line_2`
  - `city`, `postal_code`, `country`, `state`
- **Métadonnées**: 
  - `type` (shipping/billing)
  - `is_default`
  - `label` (Maison, Bureau, etc.)
- **GPS**: `latitude`, `longitude` (optionnels)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`

#### Relations:
- **Foreign Key**: `user_id` → `users(id)` CASCADE

#### Index:
- `user_id, type`, `user_id, is_default`, `deleted_at`

---

### 6. Migration des tables « cart_items » et « wishlist_items » (Paniers)
**Fichier**: `20250103000001_create_cart_and_wishlist_tables.js`  
**Date**: 3 janvier 2025

#### Table cart_items (Panier):
- **Champs**: `id` (UUID), `user_id`, `product_id`, `quantity`
- **Relations**: 
  - `user_id` → `users(id)` CASCADE
  - `product_id` → `products(id)` CASCADE
- **Contrainte**: UNIQUE `(user_id, product_id)` - évite les doublons

#### Table wishlist_items (Liste de souhaits):
- **Champs**: `id` (UUID), `user_id`, `product_id`
- **Relations**: 
  - `user_id` → `users(id)` CASCADE
  - `product_id` → `products(id)` CASCADE
- **Contrainte**: UNIQUE `(user_id, product_id)` - évite les doublons

#### Index:
- `user_id`, `product_id`, `deleted_at`

---

### 7. Migration de la table « orders » (Commandes)
**Fichier**: `20250926135100_005_create_orders_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `order_number` (ex: AFM-2024-001234)
- **Relations**: `customer_id`, `store_id`
- **Statut**: `status` (pending/paid/confirmed/processing/shipped/delivered/cancelled/refunded/returned)
- **Finances**:
  - `subtotal`, `shipping_cost`, `tax_amount`, `discount_amount`, `total_amount`
  - `currency` (FCFA par défaut)
- **Coupons**: `coupon_code`, `coupon_discount`
- **Livraison**:
  - `delivery_address` (JSON), `billing_address` (JSON)
  - `delivery_method`, `delivery_notes`
  - `estimated_delivery_date`, `actual_delivery_date`
- **Contact**: `customer_phone`, `customer_email`, `customer_name`
- **Suivi**: `tracking_number`, `tracking_url`, `carrier`
- **Paiement**:
  - `payment_method` (tmoney/flooz/orange_money/mtn_money/cash_on_delivery/bank_transfer/paypal/stripe)
  - `payment_status` (pending/paid/failed/refunded/partially_refunded)
  - `payment_date`, `payment_reference`, `payment_notes`
- **Notes**: `customer_notes`, `admin_notes`
- **Autres**: `language`, `source` (web/mobile/admin/import)

#### Relations:
- **Foreign Keys**:
  - `customer_id` → `users(id)`
  - `store_id` → `stores(id)`

#### Index:
- `customer_id`, `store_id`, `order_number`, `status`, `payment_status`, `payment_method`, `tracking_number`

---

### 8. Migration de la table « order_items » (Articles de commande)
**Fichier**: `20250926135220_006_create_order_items_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID)
- **Relations**: `order_id`, `product_id`, `store_id`
- **Détails produit**: `product_name`, `product_sku`, `product_image`
- **Quantité et prix**: 
  - `quantity`, `unit_price`, `subtotal`
  - `tax_amount`, `discount_amount`, `total`
- **Variante**: `variant_options` (JSON - couleur, taille, etc.)
- **Personnalisation**: `customization_details` (JSON)

#### Relations:
- **Foreign Keys**:
  - `order_id` → `orders(id)` CASCADE
  - `product_id` → `products(id)`
  - `store_id` → `stores(id)`

---

### 9. Migration de la table « payments » (Paiements)
**Fichier**: `20250926135349_007_create_payments_table.js`  
**Date**: 26 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `payment_reference` (unique)
- **Relations**: `order_id`, `customer_id`, `store_id`
- **Méthode**: `payment_method` (tmoney/flooz/orange_money/mtn_money/moov_money/cash_on_delivery/bank_transfer/paypal/stripe/wave/other)
- **Statut**: `status` (pending/processing/completed/failed/cancelled/expired/refunded/partially_refunded)
- **Finances**:
  - `amount`, `currency`, `exchange_rate`
  - `fee_amount`, `net_amount`
- **Provider**:
  - `provider_transaction_id`, `provider_reference`
  - `provider_response` (JSON), `provider_status`
- **Mobile Money**:
  - `phone_number`, `operator`, `wallet_id`
- **Virement bancaire**:
  - `bank_name`, `account_number`, `account_holder`
  - `swift_code`, `iban`
- **Carte bancaire**:
  - `card_last_four`, `card_brand`, `card_type`
- **Timestamps**:
  - `initiated_at`, `processed_at`, `completed_at`, `expires_at`
- **Retry**: `retry_count`, `last_retry_at`, `max_retries`
- **Webhook**: `webhook_data` (JSON), `webhook_received_at`, `webhook_verified`
- **Notifications**: `customer_notified`, `store_notified`, `notification_sent_at`
- **Réconciliation**: `reconciled`, `reconciled_at`, `reconciled_by`
- **Commissions**:
  - `platform_commission`, `store_payout`
  - `payout_processed`, `payout_date`
- **Autres**: `notes`, `failure_reason`, `metadata` (JSON)
- **Snapshot client**: `customer_name`, `customer_email`, `customer_phone`

#### Relations:
- **Foreign Keys**:
  - `order_id` → `orders(id)`
  - `customer_id` → `users(id)`
  - `store_id` → `stores(id)`

#### Index:
- `order_id`, `customer_id`, `store_id`, `payment_reference`, `payment_method`, `status`
- `provider_transaction_id`, `phone_number`, `initiated_at`, `completed_at`
- **Composites**: `(status, payment_method)`, `(customer_id, status)`, `(store_id, status)`

---

### 10. Migration des tables « reviews » (Avis)
**Fichier**: `20250926140611_008_create_reviews_tables_table.js`  
**Date**: 26 septembre 2025

#### Table product_reviews (Avis produits):
- **Champs principaux**:
  - `id` (UUID), `product_id`, `customer_id`, `order_id`
  - `rating` (1-5 étoiles), `title`, `comment`
  - `media_urls` (JSON - images/vidéos)
- **Modération**:
  - `status` (pending/published/rejected/hidden)
  - `moderation_notes`, `moderated_by`, `moderated_at`
- **Achat vérifié**:
  - `verified_purchase`, `purchase_variant`
- **Utilité**:
  - `helpful_count`, `not_helpful_count`
- **Réponse vendeur**:
  - `seller_response`, `seller_response_date`, `seller_response_by`

**Contrainte**: UNIQUE `(product_id, customer_id)` - un avis par client par produit

#### Table order_reviews (Avis commandes):
- **Champs principaux**:
  - `id` (UUID), `order_id`, `customer_id`, `store_id`
  - `rating` (global 1-5)
- **Évaluations détaillées**:
  - `product_quality_rating` (1-5)
  - `delivery_speed_rating` (1-5)
  - `customer_service_rating` (1-5)
  - `packaging_rating` (1-5)
- **Recommandation**: `would_recommend`

**Contrainte**: UNIQUE `order_id` - un seul avis par commande

#### Table review_helpfulness (Votes d'utilité):
- **Champs**: `id`, `review_id`, `user_id`, `is_helpful`
- **Contrainte**: UNIQUE `(review_id, user_id)` - un vote par utilisateur par avis

#### Relations:
- **Foreign Keys**:
  - `product_id` → `products(id)`
  - `customer_id` → `users(id)`
  - `order_id` → `orders(id)`
  - `store_id` → `stores(id)`
  - `review_id` → `product_reviews(id)` CASCADE

---

### 11. Migration de la table « notifications » (Notifications)
**Fichier**: `20250927141001_014_create_notifications_table.js`  
**Date**: 27 septembre 2025

#### Champs principaux:
- **Identification**: `id` (UUID), `user_id`, `device_token_id`
- **Contenu**:
  - `type`, `title`, `body`
  - `data` (JSON - deep links, etc.)
- **Catégorisation**:
  - `category` (order/delivery/payment/promotion/product/account/support/system/marketing/reminder)
  - `priority` (low/normal/high/urgent)
- **Médias**: `image_url`, `icon_url`, `sound`
- **Affichage**: `display_options` (JSON), `action_url`, `actions` (JSON)
- **Planification**:
  - `scheduled_at`, `expires_at`, `is_scheduled`
- **Statut**: `status` (draft/scheduled/sending/sent/delivered/read/failed/expired)
- **Envoi**:
  - `sent_at`, `delivered_at`, `read_at`
  - `delivery_details` (JSON)
- **Tracking**:
  - `clicked`, `clicked_at`, `click_count`
  - `interaction_data` (JSON)
- **Ciblage**:
  - `target_criteria` (JSON)
  - `campaign_id`, `batch_id`
- **Relations**: 
  - `related_order_id`, `related_product_id`
  - `related_coupon_id`, `related_ticket_id`

#### Relations:
- **Foreign Keys**:
  - `user_id` → `users(id)` CASCADE
  - `device_token_id` → `device_tokens(id)` SET NULL
  - `related_order_id` → `orders(id)` SET NULL
  - `related_product_id` → `products(id)` SET NULL
  - `related_coupon_id` → `coupons(id)` SET NULL
  - `related_ticket_id` → `tickets(id)` SET NULL

#### Index multiples:
- Simples: `user_id`, `type`, `category`, `status`, `priority`, `sent_at`, `scheduled_at`
- Composites: `(user_id, status)`, `(user_id, category)`

---

## 📊 Tables Complémentaires

### Support Client
- **tickets** (`20250927134500_009_create_tickets_table.js`)
- **ticket_messages** (`20250927134501_010_create_ticket_messages_table.js`)

### Marketing et Promotions
- **coupons** (`20250927140000_011_create_coupons_table.js`)
- **coupon_usage** (`20250927140001_012_create_coupon_usage_table.js`)
- **email_campaigns** (`20250927185100_023_create_email_campaigns_table.js`)
- **email_templates** (`20250927185200_024_create_email_templates_table.js`)
- **email_analytics** (`20250927185300_025_create_email_analytics_table.js`)
- **newsletter_subscriptions** (`20250927185400_026_create_newsletter_subscriptions_table.js`)

### Notifications Push
- **device_tokens** (`20250927141000_013_create_device_tokens_table.js`)

### Sécurité et Audit
- **email_otp** (`20250927170000_017_create_email_otp_table.js`)
- **security_logs** (`20250927170001_018_create_security_logs_table.js`)
- **system_logs** (`20250927180000_021_create_system_logs_table.js`)

### Rapports
- **scheduled_reports** (`20250927173500_019_create_scheduled_reports_table.js`)
- **report_exports** (`20250927173600_020_create_report_exports_table.js`)

### Segmentation Client
- **customer_segments** (`20250927185000_022_create_customer_segments_table.js`)

### Système de Parrainage
- **referrals_system** (`20250927150000_015_create_referrals_system.js`)

### Taux de Change
- **exchange_rates** (`20250927150001_016_create_exchange_rates.js`)

### API et Webhooks
- **api_keys** (`20250927151000_010_create_api_keys_table.js`)
- **webhooks_tables** (`20250927150000_009_create_webhooks_tables.js`)

### Médias
- **media_tables** (`20250101000009_create_media_tables.js`)

### Fonctionnalités Mobiles
- **mobile_features_tables** (`20250927190310_create_mobile_features_tables.js`)

---

## 🔗 Diagramme de Relations

```
users (utilisateurs)
├── stores (boutiques) - via owner_id
├── orders (commandes) - via customer_id
├── user_addresses (adresses) - via user_id
├── cart_items (panier) - via user_id
├── wishlist_items (liste de souhaits) - via user_id
├── product_reviews (avis produits) - via customer_id
├── order_reviews (avis commandes) - via customer_id
├── payments (paiements) - via customer_id
├── notifications (notifications) - via user_id
└── tickets (support) - via user_id

stores (boutiques)
├── products (produits) - via store_id
├── orders (commandes) - via store_id
├── categories (catégories spécifiques) - via store_id
└── payments (paiements) - via store_id

categories (catégories)
├── products (produits) - via category_id
└── categories (sous-catégories) - via parent_id (auto-référence)

products (produits)
├── cart_items (panier) - via product_id
├── wishlist_items (liste de souhaits) - via product_id
├── order_items (articles de commande) - via product_id
└── product_reviews (avis) - via product_id

orders (commandes)
├── order_items (articles) - via order_id
├── payments (paiements) - via order_id
├── product_reviews (avis vérifiés) - via order_id
└── order_reviews (avis commande) - via order_id

product_reviews (avis produits)
└── review_helpfulness (votes utilité) - via review_id
```

---

## 🚀 Commandes Utiles

### Exécuter toutes les migrations
```bash
npm run migrate
# ou
npx knex migrate:latest
```

### Annuler la dernière migration
```bash
npx knex migrate:rollback
```

### Voir le statut des migrations
```bash
npx knex migrate:status
```

### Créer une nouvelle migration
```bash
npx knex migrate:make nom_de_la_migration
```

### Exécuter les seeds (données de test)
```bash
npm run seed
# ou
npx knex seed:run
```

---

## 📝 Notes Importantes

### Multi-tenant
Toutes les tables principales incluent un champ `tenant_id` pour supporter le multi-tenant (plusieurs instances de la plateforme).

### Soft Delete
La plupart des tables utilisent le soft delete avec un champ `deleted_at` au lieu de supprimer définitivement les données.

### Audit Trail
Toutes les tables incluent des champs d'audit:
- `created_at`, `created_by`
- `updated_at`, `updated_by`
- `deleted_at`, `deleted_by`

### Indexation
Des index sont créés sur tous les champs fréquemment utilisés dans les requêtes pour optimiser les performances.

### JSON Fields
De nombreuses tables utilisent des champs JSON pour stocker des données flexibles (métadonnées, configurations, traductions).

### Contraintes d'intégrité
Des clés étrangères et contraintes uniques assurent l'intégrité référentielle de la base de données.

---

## 📞 Support

Pour toute question concernant les migrations, contactez l'équipe de développement.

**Date de dernière mise à jour**: 2 novembre 2025
