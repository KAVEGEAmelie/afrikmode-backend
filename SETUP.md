# Guide de Configuration - AfrikMode Backend

## Prérequis

- Node.js (v18+)
- PostgreSQL
- Redis
- npm ou yarn

## Installation

1. **Cloner le repository**
```bash
git clone https://github.com/KAVEGEAmelie/afrikmode-backend.git
cd afrikmode-backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez les fichiers d'exemple et configurez-les :
```bash
cp .env.example .env
cp .env.media.example .env.media
cp .env.notifications.example .env.notifications
```

Éditez `.env` et configurez :
- `DATABASE_URL` : URL de connexion PostgreSQL
- `REDIS_URL` : URL de connexion Redis
- `JWT_SECRET` : Secret pour les tokens JWT
- `JWT_EXPIRES_IN` : Durée de validité des tokens
- `PORT` : Port du serveur (défaut: 5000)
- `NODE_ENV` : Environnement (development/production)

4. **Configurer la base de données**

```bash
# Créer la base de données
createdb afrikmode_db

# Exécuter les migrations
npm run migrate

# Optionnel : Charger les données de test
npm run seed
```

5. **Démarrer le serveur**

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## Structure du Projet

```
backend/
├── src/
│   ├── config/          # Configuration (DB, Redis, Firebase, etc.)
│   ├── controllers/     # Contrôleurs API
│   ├── middleware/      # Middlewares Express
│   ├── models/          # Modèles de données
│   ├── routes/          # Routes API
│   ├── services/        # Services métier
│   └── utils/           # Utilitaires
├── migrations/          # Migrations Knex.js
├── seeds/               # Seeds de données
└── tests/               # Tests unitaires
```

## API Documentation

Une fois le serveur démarré, accédez à la documentation Swagger :
- URL : `http://localhost:5000/api-docs`

## Variables d'environnement importantes

### Base de données
- `DATABASE_URL` : URL PostgreSQL complète
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` : Détails de connexion

### Redis
- `REDIS_URL` : URL Redis (optionnel pour le cache)

### JWT
- `JWT_SECRET` : Secret pour signer les tokens
- `JWT_EXPIRES_IN` : Durée (ex: "7d", "24h")

### Firebase (Notifications push)
- Voir `FIREBASE_SETUP.md` pour la configuration complète

### Uploads
- `MAX_FILE_SIZE` : Taille max des fichiers (défaut: 5MB)
- `UPLOAD_PATH` : Chemin de stockage local

## Commandes utiles

```bash
# Migrations
npm run migrate          # Exécuter toutes les migrations
npm run migrate:rollback # Rollback dernière migration
npm run migrate:latest   # Migrer vers la dernière version

# Seeds
npm run seed            # Charger toutes les seeds

# Tests
npm test                # Lancer tous les tests
npm run test:watch      # Tests en mode watch

# Linting
npm run lint            # Vérifier le code
npm run lint:fix        # Corriger automatiquement
```

## Support

Pour toute question, consultez :
- `README.md` : Vue d'ensemble
- `docs/` : Documentation détaillée
- `AUDIT/RAPPORT-COMPLET.md` : Audit du système

