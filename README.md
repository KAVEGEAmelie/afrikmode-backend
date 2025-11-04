# 🛍️ AFRIKMODE BACKEND API

## 🎯 Vue d'ensemble

AfrikMode est une plateforme e-commerce moderne et complète conçue spécifiquement pour le marché africain. Cette API Backend fournit toutes les fonctionnalités nécessaires pour une marketplace robuste avec gestion des boutiques, produits, commandes, paiements et bien plus.

### ✨ Fonctionnalités Principales

- 🏪 **Multi-boutiques** - Gestion complète des boutiques et vendeurs
- 🛒 **E-commerce** - Catalogue produits, panier, commandes
- 💳 **Paiements** - Stripe, PayPal, Mobile Money (Orange, MTN, Moov)
- 👥 **Utilisateurs** - Authentification JWT + 2FA, rôles avancés
- 📱 **Mobile First** - API optimisée pour React Native/Flutter
- 🔔 **Notifications** - Push (Firebase), Email, SMS
- 📊 **Analytics** - Dashboard admin avec statistiques avancées
- 🎫 **Support** - Système de tickets intégré
- 🎁 **Promotions** - Coupons, codes promo, programme de fidélité
- 🛡️ **Sécurité** - Rate limiting, audit complet, monitoring

---

## 🏗️ Architecture

### 📊 Base de Données (45 Tables)
- **PostgreSQL** - Base principale avec 45 tables optimisées
- **Redis** - Cache et sessions
- **Firebase** - Notifications push et authentification sociale

### 🔧 Technologies
- **Node.js** + **Express.js** - Backend API REST
- **PostgreSQL** - Base de données relationnelle
- **Redis** - Cache et stockage sessions
- **Firebase** - Notifications et auth sociale
- **Knex.js** - Query builder et migrations
- **Jest** - Tests unitaires et d'intégration

---

## 🚀 Installation Rapide

### 📋 Prérequis
```bash
Node.js >= 16.x
PostgreSQL >= 13.x
Redis >= 6.x
npm ou yarn
```

### 💻 Installation
```bash
# Cloner le repository
git clone https://github.com/votre-username/afrikmode-backend.git
cd afrikmode-backend

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env

# Configurer la base de données dans .env
# Voir section Configuration ci-dessous

# Créer la base de données
createdb afrikmode_dev

# Exécuter les migrations
npm run migrate

# Insérer les données de test
npm run seed

# Démarrer le serveur de développement
npm run dev
```

Le serveur sera accessible sur `http://localhost:5000`

---

## ⚙️ Configuration

### 🔐 Variables d'Environnement

Copiez `.env.example` vers `.env` et configurez les variables suivantes :

```bash
# Base de données
DATABASE_URL="postgresql://username:password@localhost:5432/afrikmode_dev"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="afrikmode_dev"
DB_USER="your_username"
DB_PASSWORD="your_password"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# JWT
JWT_SECRET="your_super_secret_jwt_key_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# API
PORT="5000"
NODE_ENV="development"
API_BASE_URL="http://localhost:5000"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
FROM_EMAIL="noreply@afrikmode.com"
FROM_NAME="AfrikMode"

# Firebase (Notifications)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"

# Paiements
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-secret"

# Stockage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760"
ALLOWED_IMAGE_TYPES="image/jpeg,image/png,image/webp"

# Rate Limiting
RATE_LIMIT_WINDOW="15"
RATE_LIMIT_MAX="100"

# Sécurité
CORS_ORIGIN="http://localhost:4200"
BCRYPT_ROUNDS="12"
```

### 🐳 Docker (Développement)

Pour faciliter le développement, utilisez Docker Compose :

```bash
# Démarrer PostgreSQL et Redis
docker-compose up -d db redis

# Ou démarrer tout l'environnement
docker-compose up
```

---

## 📚 Scripts NPM

```bash
# Développement
npm run dev          # Démarrer avec nodemon
npm run start        # Démarrer en mode production

# Base de données
npm run migrate      # Exécuter les migrations
npm run migrate:down # Rollback dernière migration
npm run seed         # Insérer données de test
npm run reset-db     # Reset complet de la DB

# Tests
npm test             # Lancer tous les tests
npm run test:watch   # Tests en mode watch
npm run test:coverage # Tests avec couverture

# Qualité du code
npm run lint         # ESLint
npm run lint:fix     # Corriger automatiquement
npm run format       # Prettier

# Production
npm run build        # Build pour production
npm run start:prod   # Démarrer en production
```

---

## 🔗 API Endpoints

### 🔐 Authentification
```
POST   /api/auth/register     # Inscription
POST   /api/auth/login        # Connexion
POST   /api/auth/refresh      # Refresh token
POST   /api/auth/logout       # Déconnexion
POST   /api/auth/forgot       # Mot de passe oublié
POST   /api/auth/reset        # Reset mot de passe
POST   /api/auth/verify-2fa   # Vérification 2FA
```

### 👥 Utilisateurs
```
GET    /api/users             # Liste utilisateurs (admin)
GET    /api/users/:id         # Détail utilisateur
PUT    /api/users/:id         # Modifier utilisateur
DELETE /api/users/:id         # Supprimer utilisateur
POST   /api/users/:id/suspend # Suspendre utilisateur
```

### 🏪 Boutiques
```
GET    /api/stores            # Liste boutiques
POST   /api/stores            # Créer boutique
GET    /api/stores/:id        # Détail boutique
PUT    /api/stores/:id        # Modifier boutique
DELETE /api/stores/:id        # Supprimer boutique
POST   /api/stores/:id/follow # Suivre boutique
```

### 📦 Produits
```
GET    /api/products          # Liste produits
POST   /api/products          # Créer produit
GET    /api/products/:id      # Détail produit
PUT    /api/products/:id      # Modifier produit
DELETE /api/products/:id      # Supprimer produit
POST   /api/products/:id/favorite # Ajouter favoris
```

### 🛒 Commandes
```
GET    /api/orders            # Mes commandes
POST   /api/orders            # Créer commande
GET    /api/orders/:id        # Détail commande
PUT    /api/orders/:id/status # Modifier statut
POST   /api/orders/:id/cancel # Annuler commande
```

### 💳 Paiements
```
POST   /api/payments/initialize  # Initialiser paiement
POST   /api/payments/confirm     # Confirmer paiement
GET    /api/payments/:id/status  # Statut paiement
POST   /api/payments/:id/refund  # Remboursement
```

### 📊 Analytics (Admin)
```
GET    /api/analytics/dashboard  # Dashboard principal
GET    /api/analytics/revenue    # Statistiques revenus
GET    /api/analytics/users      # Statistiques utilisateurs
GET    /api/analytics/products   # Statistiques produits
```

**📖 Documentation complète** : Consultez le dossier `/docs` pour une documentation détaillée de chaque endpoint.

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm test

# Tests avec coverage
npm run test:coverage

# Tests spécifiques
npm test -- --grep "Auth"
npm test -- tests/controllers/authController.test.js
```

### 📊 Coverage
Le projet vise une couverture de tests de **80%+ minimum**.

---

## 🛡️ Sécurité

### 🔒 Mesures Implémentées
- **JWT + Refresh Tokens** - Authentification sécurisée
- **2FA** - Authentification à deux facteurs
- **Rate Limiting** - Protection contre les attaques par force brute
- **Input Validation** - Validation complète des données
- **SQL Injection Protection** - Via Knex.js parameterized queries
- **CORS** - Configuration sécurisée
- **Helmet.js** - Headers de sécurité
- **Audit Logging** - Traçabilité complète des actions

### 🛡️ Bonnes Pratiques
- **Mots de passe hachés** avec bcrypt (12 rounds)
- **Sessions sécurisées** avec Redis
- **Chiffrement des données sensibles**
- **Monitoring en temps réel**
- **Backups automatiques**

---

## 📊 Monitoring & Logs

### 📈 Métriques Surveillées
- Performance API (temps de réponse)
- Taux d'erreur par endpoint
- Utilisation mémoire/CPU
- Connexions base de données
- Cache Redis hit rate

### 📝 Logs
```bash
# Logs de l'application
tail -f logs/app.log

# Logs d'erreur
tail -f logs/error.log

# Logs d'audit
tail -f logs/audit.log
```

---

## 🚀 Déploiement

### 🌍 Environnements
- **Development** - Local avec Docker
- **Staging** - Tests avant production  
- **Production** - Serveur principal

### 📦 Docker Production
```bash
# Build de l'image
docker build -t afrikmode-backend .

# Déploiement avec docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### ☁️ Cloud (Recommandé)
- **AWS** - EC2 + RDS + ElastiCache
- **Google Cloud** - Compute Engine + Cloud SQL + Redis
- **Azure** - App Service + PostgreSQL + Redis

---

## 🤝 Contribution

### 📋 Processus de Contribution
1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/awesome-feature`)
3. **Commit** vos changements (`git commit -m 'Add awesome feature'`)
4. **Push** vers la branche (`git push origin feature/awesome-feature`)
5. **Ouvrir** une Pull Request

### 📏 Standards de Code
- **ESLint** - Respect des règles définies
- **Prettier** - Formatage automatique
- **Tests** - Coverage minimum 80%
- **Documentation** - JSDoc pour les fonctions importantes
- **Commits** - Messages explicites et atomiques

---

## 📞 Support & Documentation

### 📖 Documentation
- **[Architecture Complète](./docs/architecture/ARCHITECTURE_COMPLETE.md)** - Vue détaillée de l'API
- **[Interface Admin](./docs/admin/ADMIN_INTERFACE_GUIDE.md)** - Guide complet admin
- **[Interface Manager](./docs/manager/MANAGER_INTERFACE_GUIDE.md)** - Guide pour managers
- **[Client Mobile](./docs/client-mobile/MOBILE_CLIENT_GUIDE.md)** - Apps iOS/Android
- **[Guide d'Intégration](./docs/architecture/GUIDE_INTEGRATION_FRONTEND.md)** - Frontend Angular

### 🆘 Besoin d'Aide ?
- **Issues** - [GitHub Issues](https://github.com/votre-username/afrikmode-backend/issues)
- **Wiki** - [Documentation Wiki](https://github.com/votre-username/afrikmode-backend/wiki)
- **Email** - support@afrikmode.com

---

## 📄 License

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

## 👨‍💻 Équipe de Développement

- **Lead Developer** - [Votre Nom](https://github.com/votre-username)
- **Backend Developer** - [Nom Collègue 1](https://github.com/collegue1)
- **Frontend Developer** - [Nom Collègue 2](https://github.com/collegue2)

---

## 🎯 Roadmap

### ✅ Version 1.0 (Actuelle)
- [x] API complète avec 45 tables
- [x] Authentification JWT + 2FA
- [x] Paiements multi-providers
- [x] Interface admin complète
- [x] Documentation complète

### 🚀 Version 1.1 (Prochaine)
- [ ] API GraphQL en complément REST
- [ ] WebSockets pour temps réel
- [ ] Intelligence artificielle (recommandations)
- [ ] Analytics avancés
- [ ] App mobile native

### 🌟 Version 2.0 (Future)
- [ ] Architecture microservices
- [ ] Blockchain pour traçabilité
- [ ] IA avancée pour personnalisation
- [ ] Multi-langues/devises
- [ ] Marketplace internationale

---

**⭐ Si ce projet vous aide, n'hésitez pas à lui donner une étoile sur GitHub !**

🚀 **Happy Coding!** 🎯
