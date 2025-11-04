# 🌍 ARCHITECTURE COMPLÈTE - AFRIKMODE BACKEND API

## 📋 VUE D'ENSEMBLE

**AfrikMode Backend** est une API REST complète pour une plateforme e-commerce de mode africaine, développée en Node.js avec Express.js et PostgreSQL.

### 🔧 Technologies Principales
- **Framework**: Express.js v4.18.2
- **Base de données**: PostgreSQL avec Knex.js ORM
- **Cache**: Redis (optionnel) + Cache mémoire
- **Authentification**: JWT + 2FA (TOTP)
- **Push Notifications**: Firebase Cloud Messaging
- **Upload de fichiers**: Multer + AWS S3
- **WebSockets**: Socket.io pour chat temps réel
- **GraphQL**: Apollo Server Express
- **Documentation**: Swagger UI

### 🚀 Serveur Principal
**Port**: 5000 (configurable)
**Entry Point**: `src/server.js`

---

## 📊 BASE DE DONNÉES - SCHEMA COMPLET

### 🏗️ Tables Principales (45 tables totales)

#### **1. 👥 UTILISATEURS & AUTHENTIFICATION**
```sql
-- Tables principales
users                    -- Utilisateurs principaux
email_otp_codes          -- Codes OTP pour vérification email
security_logs            -- Logs de sécurité
device_tokens            -- Tokens pour push notifications
api_keys                 -- Clés API pour développeurs

-- Colonnes importantes users:
id (UUID), email, password_hash, role (admin/vendor/customer), 
first_name, last_name, phone, avatar_url, is_verified, 
two_factor_enabled, two_factor_secret, created_at, updated_at
```

#### **2. 🏪 COMMERCE**
```sql
-- Structure commerce
stores                   -- Magasins/boutiques  
categories              -- Catégories de produits
products                -- Produits avec variations
orders                  -- Commandes
order_items             -- Items dans les commandes
payments                -- Paiements et transactions
reviews                 -- Avis et évaluations

-- Détails produits:
id (UUID), name, description, price, discounted_price, 
sku, stock_quantity, images[], category_id, store_id,
variants (JSON), specifications (JSON), is_active
```

#### **3. 💰 SYSTÈME DE PROMOTIONS**
```sql
coupons                 -- Codes de réduction
coupon_usage           -- Utilisation des coupons
referral_codes         -- Codes de parrainage  
referrals              -- Système de parrainage
referral_rewards       -- Récompenses de parrainage
exchange_rates         -- Taux de change multi-devises
```

#### **4. 📞 SUPPORT CLIENT**
```sql
tickets                -- Tickets de support
ticket_messages        -- Messages des conversations
notifications          -- Notifications système
```

#### **5. 📱 FONCTIONNALITÉS MOBILE**
```sql
deep_links             -- Liens profonds mobile
deep_link_clicks       -- Analytiques des liens
push_notification_logs -- Logs des notifications push
offline_cache_logs     -- Cache hors-ligne
offline_sync_queue     -- File de synchronisation
mobile_user_preferences -- Préférences mobile
```

#### **6. 📧 EMAIL MARKETING**  
```sql
customer_segments      -- Segmentation clients
email_campaigns        -- Campagnes email
email_templates        -- Templates d'email
email_analytics        -- Statistiques email
newsletter_subscriptions -- Abonnements newsletter
```

#### **7. 📈 RAPPORTS & MONITORING**
```sql
scheduled_reports      -- Rapports programmés
report_exports         -- Exports de rapports
system_logs           -- Logs système
```

#### **8. 🎬 MÉDIA & CONTENUS**
```sql
media_files           -- Fichiers média (images, vidéos)
media_access_logs     -- Logs d'accès média
media_processing_jobs -- Jobs de traitement média
system_config         -- Configuration système
```

#### **9. 🔗 INTÉGRATIONS**
```sql
webhooks              -- Webhooks sortants
webhook_deliveries    -- Livraisons webhook
```

---

## 🗂️ STRUCTURE DES DOSSIERS

```
backend/
├── 📄 Configuration
│   ├── package.json          -- Dépendances et scripts
│   ├── knexfile.js          -- Configuration base de données
│   ├── jest.config.json     -- Tests unitaires
│   └── Dockerfile           -- Conteneurisation
│
├── 🗃️ migrations/           -- Scripts de migration DB (30+ fichiers)
│   ├── 20250926134023_create_users_table.js
│   ├── 20250926134322_002_create_stores_table.js
│   └── ... (toutes les tables)
│
├── 🌱 seeds/                -- Données de test
│   ├── 01_users.js
│   ├── 02_categories.js
│   ├── 03_stores.js
│   ├── 04_product.js
│   └── 05_notifications.js
│
├── 📁 src/
│   ├── 🎯 server.js         -- Point d'entrée principal
│   │
│   ├── ⚙️ config/           -- Configurations
│   │   ├── database.js      -- Configuration PostgreSQL  
│   │   ├── redis.js         -- Configuration Redis
│   │   ├── firebase.js      -- Firebase FCM
│   │   ├── mail.js          -- Configuration email
│   │   ├── storage.js       -- AWS S3
│   │   └── swagger.js       -- Documentation API
│   │
│   ├── 🛣️ routes/           -- Routes API (20 fichiers)
│   │   ├── index.js         -- Routes principales + health check
│   │   ├── auth.js          -- Authentification
│   │   ├── users.js         -- Gestion utilisateurs
│   │   ├── stores.js        -- Gestion boutiques
│   │   ├── products.js      -- Gestion produits
│   │   ├── orders.js        -- Gestion commandes
│   │   ├── payments.js      -- Paiements
│   │   ├── categories.js    -- Catégories
│   │   ├── analytics.js     -- Analytiques
│   │   ├── tickets.js       -- Support client
│   │   ├── coupons.js       -- Codes promo
│   │   ├── notifications.js -- Notifications
│   │   ├── referrals.js     -- Parrainage
│   │   ├── currencies.js    -- Multi-devises
│   │   ├── twoFactor.js     -- 2FA
│   │   ├── reports.js       -- Rapports
│   │   ├── security.js      -- Sécurité
│   │   ├── newsletter.js    -- Marketing email
│   │   ├── seo.js           -- SEO
│   │   ├── api.js           -- API avancées
│   │   ├── media.js         -- Gestion média
│   │   ├── mobile.js        -- Fonctionnalités mobile
│   │   └── i18n.js          -- Internationalisation
│   │
│   ├── 🎮 controllers/      -- Logique métier (15 controllers)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── storeController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── paymentController.js
│   │   ├── categoryController.js
│   │   ├── analyticsController.js
│   │   ├── ticketController.js
│   │   ├── couponController.js
│   │   ├── notificationController.js
│   │   ├── referralController.js
│   │   ├── reportController.js
│   │   ├── twoFactorController.js
│   │   ├── newsletterController.js
│   │   ├── securityController.js
│   │   ├── seoController.js
│   │   ├── apiController.js
│   │   ├── mediaController.js
│   │   └── mobileController.js
│   │
│   ├── 🏗️ models/           -- Modèles de données
│   │   ├── User.js
│   │   ├── Store.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Category.js
│   │   ├── Review.js
│   │   ├── Ticket.js
│   │   └── Coupon.js
│   │
│   ├── 🛡️ middleware/        -- Middlewares
│   │   ├── auth.js          -- Authentification JWT
│   │   ├── validation.js    -- Validation des données
│   │   ├── errorHandler.js  -- Gestion d'erreurs
│   │   ├── rateLimiter.js   -- Limitation de taux
│   │   ├── upload.js        -- Upload de fichiers
│   │   ├── cache.js         -- Cache (Redis/Mémoire)
│   │   ├── i18n.js          -- Internationalisation
│   │   ├── currency.js      -- Multi-devises
│   │   └── twoFactor.js     -- 2FA
│   │
│   ├── 🔧 services/         -- Services métier (25 services)
│   │   ├── emailService.js         -- Service email
│   │   ├── paymentService.js       -- Paiements
│   │   ├── uploadService.js        -- Upload fichiers
│   │   ├── notificationService.js  -- Notifications push
│   │   ├── analyticsService.js     -- Analytiques
│   │   ├── referralService.js      -- Parrainage
│   │   ├── reportService.js        -- Génération rapports
│   │   ├── scheduledReportService.js -- Rapports programmés
│   │   ├── systemLogService.js     -- Logs système
│   │   ├── systemMonitoringService.js -- Monitoring
│   │   ├── emailCampaignService.js -- Campagnes email
│   │   ├── mediaService.js         -- Gestion média
│   │   ├── chatService.js          -- Chat temps réel
│   │   ├── twoFactorAuthService.js -- 2FA
│   │   ├── currencyService.js      -- Devises
│   │   ├── webhookService.js       -- Webhooks
│   │   ├── seoService.js           -- SEO
│   │   ├── promotionService.js     -- Promotions
│   │   ├── customerSegmentationService.js -- Segmentation
│   │   ├── mobilePushService.js    -- Push mobile
│   │   ├── deepLinkService.js      -- Liens profonds
│   │   └── offlineCacheService.js  -- Cache offline
│   │
│   ├── 🛠️ utils/            -- Utilitaires
│   │   ├── helpers.js       -- Fonctions utilitaires
│   │   ├── constants.js     -- Constantes
│   │   └── validators.js    -- Validateurs
│   │
│   ├── 🔗 graphql/          -- API GraphQL
│   │   ├── server.js
│   │   ├── schema.js
│   │   └── resolvers.js
│   │
│   └── 🌐 locales/          -- Traductions
│       ├── fr.json
│       └── en.json
│
├── 🧪 tests/                -- Tests unitaires
│   ├── setup.js
│   ├── controllers/         -- Tests des controllers
│   ├── middleware/          -- Tests des middlewares
│   ├── models/              -- Tests des modèles
│   ├── routes/              -- Tests des routes
│   └── services/            -- Tests des services
│
├── 📤 uploads/              -- Dossier de téléchargement
│   ├── products/
│   ├── users/
│   └── temp/
│
└── 📝 logs/                 -- Logs de l'application
```

---

## 🚦 ROUTES API PRINCIPALES

### 🔐 **Authentication (`/api/auth`)**
```javascript
POST   /register           -- Inscription
POST   /login             -- Connexion
POST   /logout            -- Déconnexion
POST   /refresh-token     -- Renouvellement token
POST   /forgot-password   -- Mot de passe oublié
POST   /reset-password    -- Réinitialiser mot de passe
POST   /verify-email      -- Vérifier email
GET    /me                -- Profil utilisateur courant
```

### 👥 **Users (`/api/users`)** [🔒 Protected]
```javascript
GET    /                  -- Lister utilisateurs
GET    /:id               -- Détails utilisateur
PUT    /:id               -- Modifier utilisateur
DELETE /:id               -- Supprimer utilisateur
POST   /:id/avatar        -- Upload avatar
GET    /profile           -- Mon profil
PUT    /profile           -- Modifier mon profil
```

### 🏪 **Stores (`/api/stores`)** [🔓 Mixed]
```javascript
GET    /                  -- Lister boutiques (public)
GET    /:id               -- Détails boutique (public)
POST   /                  -- Créer boutique [🔒]
PUT    /:id               -- Modifier boutique [🔒]
DELETE /:id               -- Supprimer boutique [🔒]
GET    /:id/products      -- Produits de la boutique
GET    /:id/analytics     -- Analytiques boutique [🔒]
```

### 📦 **Products (`/api/products`)** [🔓 Mixed]
```javascript
GET    /                  -- Lister produits (public)
GET    /search            -- Rechercher produits (public)
GET    /:id               -- Détails produit (public)
POST   /                  -- Créer produit [🔒]
PUT    /:id               -- Modifier produit [🔒]
DELETE /:id               -- Supprimer produit [🔒]
POST   /:id/images        -- Upload images [🔒]
POST   /:id/reviews       -- Ajouter avis [🔒]
```

### 🛒 **Orders (`/api/orders`)** [🔒 Protected]
```javascript
GET    /                  -- Mes commandes
GET    /:id               -- Détails commande
POST   /                  -- Créer commande
PUT    /:id/status        -- Modifier statut
POST   /:id/cancel        -- Annuler commande
GET    /:id/tracking      -- Suivi de commande
```

### 💳 **Payments (`/api/payments`)** [🔒 Protected]
```javascript
POST   /process           -- Traiter paiement
GET    /methods           -- Méthodes de paiement
POST   /refund            -- Remboursement
GET    /history           -- Historique paiements
```

### 📊 **Analytics (`/api/analytics`)** [🔒 Protected]
```javascript
GET    /dashboard         -- Tableau de bord
GET    /sales             -- Statistiques ventes
GET    /products          -- Analytics produits
GET    /users             -- Analytics utilisateurs
GET    /revenue           -- Revenus
```

### 🎫 **Support Tickets (`/api/tickets`)** [🔒 Protected]
```javascript
GET    /                  -- Mes tickets
GET    /:id               -- Détails ticket
POST   /                  -- Créer ticket
PUT    /:id               -- Modifier ticket
POST   /:id/messages      -- Ajouter message
PUT    /:id/status        -- Changer statut
```

### 🎁 **Coupons (`/api/coupons`)** [🔒 Protected]
```javascript
GET    /                  -- Lister coupons
POST   /                  -- Créer coupon
PUT    /:id               -- Modifier coupon
DELETE /:id               -- Supprimer coupon
POST   /validate          -- Valider coupon
```

### 🔔 **Notifications (`/api/notifications`)** [🔒 Protected]
```javascript
GET    /                  -- Mes notifications
PUT    /:id/read          -- Marquer comme lu
DELETE /:id               -- Supprimer notification
POST   /mark-all-read     -- Tout marquer comme lu
POST   /send              -- Envoyer notification [Admin]
```

### 💎 **Referrals (`/api/referrals`)** [🔓 Mixed]
```javascript
POST   /register          -- S'inscrire avec code (public)
GET    /my-code           -- Mon code de parrainage [🔒]
GET    /stats             -- Statistiques parrainage [🔒]
```

### 💱 **Currencies (`/api/currencies`)** [🔓 Public]
```javascript
GET    /                  -- Devises supportées
GET    /rates             -- Taux de change actuels
```

### 🔐 **Two Factor Auth (`/api/2fa`)** [🔓 Mixed]
```javascript
POST   /enable            -- Activer 2FA [🔒]
POST   /disable           -- Désactiver 2FA [🔒]
POST   /verify            -- Vérifier code 2FA (public)
GET    /qr                -- QR Code pour setup [🔒]
```

### 📱 **Mobile Features (`/api/mobile`)** [🔓 Mixed]
```javascript
GET    /deep-links/:code  -- Résoudre lien profond (public)
POST   /push-token        -- Enregistrer token push [🔒]
GET    /offline-data      -- Données hors ligne [🔒]
POST   /sync              -- Synchroniser données [🔒]
```

### 🎬 **Media (`/api/media`)** [🔒 Protected]
```javascript
POST   /upload            -- Upload fichier
GET    /:id               -- Récupérer fichier
DELETE /:id               -- Supprimer fichier
GET    /list              -- Lister mes fichiers
```

---

## ⚙️ MIDDLEWARES DISPONIBLES

### 🔒 **Authentication & Authorization**
```javascript
requireAuth               -- JWT requis
requireRole(role)         -- Rôle spécifique requis
requireAdminOrOwner       -- Admin ou propriétaire
```

### ✅ **Validation**
```javascript
validateRequest           -- Validation express-validator
handleValidationResult    -- Gestion erreurs validation
```

### 🚦 **Rate Limiting**
```javascript
generalLimiter           -- Limite générale (100 req/15min)
authLimiter             -- Limite auth stricte (5 req/15min)
uploadLimiter           -- Limite upload (10 req/hour)
```

### 📤 **File Upload**
```javascript
uploadMiddleware         -- Upload avec Multer
imageUpload             -- Upload images seulement
documentUpload          -- Upload documents
```

### 💾 **Cache**
```javascript
cacheMiddleware(ttl)     -- Cache avec TTL configurable
clearCache(pattern)      -- Vider cache
```

### 🌍 **Internationalization**
```javascript
i18nMiddleware           -- Gestion langues (fr/en)
detectLanguage           -- Détection automatique langue
```

### 💱 **Currency**
```javascript
currencyMiddleware       -- Conversion devises
detectCurrency           -- Détection devise utilisateur
```

---

## 🔧 SERVICES MÉTIER

### 📧 **Email Services**
```javascript
emailService             -- Envoi emails transactionnels
emailCampaignService     -- Campagnes marketing
emailTemplateService     -- Templates personnalisés
mockEmailService         -- Service de test
```

### 💳 **Payment Services**  
```javascript
paymentService           -- Traitement paiements
promotionService         -- Calculs promotions/remises
```

### 📊 **Analytics & Reports**
```javascript
analyticsService         -- Collecte de données
reportService            -- Génération rapports
scheduledReportService   -- Rapports automatisés
```

### 🔔 **Notifications**
```javascript
notificationService      -- Notifications système
mobilePushService        -- Push notifications mobile
notificationTemplates    -- Templates de notifications
```

### 🎬 **Media & Files**
```javascript
mediaService             -- Gestion fichiers média
uploadService            -- Upload vers S3/local
mediaScheduler           -- Traitement asynchrone
```

### 🔗 **Integration Services**
```javascript
webhookService           -- Webhooks sortants
twoFactorAuthService     -- Authentification 2FA
referralService          -- Système de parrainage
currencyService          -- Gestion multi-devises
seoService              -- Optimisation SEO
```

### 📱 **Mobile Services**
```javascript
deepLinkService          -- Liens profonds
offlineCacheService      -- Cache hors ligne
chatService              -- Chat temps réel
```

### 🔍 **Monitoring & Security**
```javascript
systemLogService         -- Logs système
systemMonitoringService  -- Surveillance système
advancedRateLimitService -- Rate limiting avancé
customerSegmentationService -- Segmentation clients
```

---

## 📡 FONCTIONNALITÉS AVANCÉES

### 🔥 **Firebase Integration**
- **Push Notifications**: Notifications push natives
- **Cloud Messaging**: Messages temps réel
- **Analytics**: Tracking utilisateur mobile

### 📈 **Redis Cache**
- **Session Storage**: Sessions utilisateur
- **Query Caching**: Cache requêtes DB
- **Rate Limiting**: Compteurs de limitation
- **Real-time Data**: Données temps réel

### 🔗 **GraphQL API**
- **Apollo Server**: Serveur GraphQL intégré
- **Schema**: Schéma complet des données
- **Resolvers**: Résolveurs pour toutes les entités

### 📊 **Monitoring & Logs**
- **Health Checks**: Vérification état système
- **Error Tracking**: Suivi des erreurs
- **Performance Metrics**: Métriques performance
- **Audit Logs**: Logs d'audit sécurité

### 🌍 **Internationalization (i18n)**
- **Multi-language**: Support FR/EN
- **Dynamic Loading**: Chargement dynamique
- **Admin Panel**: Gestion des traductions

### 💱 **Multi-Currency**
- **Exchange Rates**: Taux de change temps réel
- **Auto Detection**: Détection automatique devise
- **Price Conversion**: Conversion automatique prix

### 🔐 **Security Features**
- **JWT Authentication**: Tokens sécurisés
- **2FA Support**: Authentification à deux facteurs
- **Rate Limiting**: Protection contre spam
- **Input Validation**: Validation stricte données
- **CORS Protection**: Protection inter-domaines
- **Helmet Security**: Headers sécurisés

---

## 🚀 COMMANDES DE DÉVELOPPEMENT

```bash
# Installation
npm install

# Développement
npm run dev          # Mode développement avec nodemon
npm start           # Mode production

# Base de données
npm run migrate     # Exécuter migrations
npm run migrate:rollback  # Annuler dernière migration
npm run seed        # Charger données de test

# Tests
npm test           # Lancer tests unitaires
npm run lint       # Vérifier code style
npm run lint:fix   # Corriger automatiquement

# Build & Deploy
docker build -t afrikmode-backend .
docker run -p 5000:5000 afrikmode-backend
```

---

## 🌐 VARIABLES D'ENVIRONNEMENT REQUISES

```bash
# Base de données
DATABASE_URL=postgresql://user:pass@localhost:5432/afrikmode
DB_HOST=localhost
DB_PORT=5432
DB_NAME=afrikmode
DB_USER=username
DB_PASSWORD=password

# Redis (optionnel)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# Application
PORT=5000
NODE_ENV=development
API_VERSION=v1
FRONTEND_URL=http://localhost:3000
```

---

## 📚 DOCUMENTATION API

- **Swagger UI**: Accessible à `/api/docs`
- **GraphQL Playground**: Accessible à `/graphql` 
- **Postman Collection**: Disponible sur demande
- **Exemples d'intégration**: Dans le dossier `examples/`

---

## ✅ ÉTAT ACTUEL DU BACKEND

### ✅ **Fonctionnalités Complètes**
- 🔐 Système d'authentification complet (JWT + 2FA)
- 👥 Gestion complète des utilisateurs
- 🏪 Système de boutiques multi-vendeur
- 📦 Gestion complète des produits avec variants
- 🛒 Système de commandes complet
- 💳 Intégration paiements
- 🎫 Support client avec tickets
- 🎁 Système de coupons et promotions
- 💎 Programme de parrainage
- 🔔 Système de notifications push
- 📊 Analytics et rapports détaillés
- 📱 Fonctionnalités mobile avancées
- 📧 Email marketing et newsletters
- 🌍 Support multi-langue
- 💱 Support multi-devises
- 🎬 Gestion avancée des médias
- 🔗 API webhooks pour intégrations
- 📈 Monitoring et logs système

### 🔧 **Configuration Technique**
- ✅ Base de données PostgreSQL (45 tables)
- ✅ Cache Redis avec fallback mémoire
- ✅ Upload AWS S3 configuré
- ✅ Firebase push notifications
- ✅ GraphQL API fonctionnelle
- ✅ Documentation Swagger
- ✅ Tests unitaires configurés
- ✅ Rate limiting avancé
- ✅ Gestion d'erreurs globale
- ✅ Logging système complet

---

Ce backend est **prêt pour la production** et supportera parfaitement votre frontend ! 🚀