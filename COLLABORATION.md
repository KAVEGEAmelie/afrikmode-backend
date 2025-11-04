# Guide de Collaboration - AfrikMode Backend

## 🚀 Démarrage rapide pour nouveaux collaborateurs

### 1. Cloner le repository
```bash
git clone https://github.com/KAVEGEAmelie/afrikmode-backend.git
cd afrikmode-backend
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement

#### Fichiers à créer :
```bash
# Copier les fichiers d'exemple
cp .env.example .env
cp .env.media.example .env.media
cp .env.notifications.example .env.notifications
```

#### Configuration minimale (.env) :
```env
# Base de données PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/afrikmode_db

# Redis (optionnel, pour le cache)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise
JWT_EXPIRES_IN=7d

# Serveur
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:4200

# Uploads
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

#### Variables d'environnement importantes :
- **Base de données** : `DATABASE_URL` ou les variables individuelles (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- **Redis** : `REDIS_URL` (optionnel)
- **JWT** : `JWT_SECRET` (obligatoire), `JWT_EXPIRES_IN` (défaut: 7d)
- **Firebase** : Voir `FIREBASE_SETUP.md` pour la configuration complète des notifications push

### 4. Initialiser la base de données

```bash
# Créer la base de données PostgreSQL
createdb afrikmode_db

# Exécuter les migrations
npm run migrate

# Optionnel : Charger des données de test
npm run seed
```

### 5. Démarrer le serveur

```bash
# Mode développement (avec rechargement automatique)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:5000`

## 📚 Documentation

### Documentation disponible :
- **`README.md`** : Vue d'ensemble du projet
- **`SETUP.md`** : Guide de configuration détaillé
- **`docs/`** : Documentation complète
  - `docs/README.md` : Index de la documentation
  - `docs/ARCHITECTURE_COMPLETE.md` : Architecture du système
  - `docs/BILAN_COMPLET_API.md` : Documentation complète de l'API
  - `docs/DIAGRAMMES_UML_COMPLETS.md` : Diagrammes UML
- **`AUDIT/RAPPORT-COMPLET.md`** : Audit complet du système

### Documentation API :
Une fois le serveur démarré, accédez à :
- **Swagger UI** : `http://localhost:5000/api-docs`
- **GraphQL Playground** : `http://localhost:5000/graphql`

## 🔑 Accès aux informations

### Informations sensibles (NE PAS COMMITTER) :
- Fichiers `.env*` (ajoutés à `.gitignore`)
- Fichiers `firebase-service-account*.json`
- Clés API et secrets

### Partage des informations sensibles :
Les informations sensibles doivent être partagées via :
1. **Variables d'environnement** : Documenter les valeurs nécessaires dans un document séparé (non commité)
2. **1Password / LastPass** : Pour le partage sécurisé des secrets
3. **Communication directe** : Email sécurisé ou Slack privé

### Structure des fichiers de configuration :
```
.env.example          # Modèle pour .env (sans valeurs réelles)
.env.media.example     # Modèle pour .env.media
.env.notifications.example  # Modèle pour .env.notifications
```

## 🛠️ Commandes utiles

### Développement
```bash
npm run dev          # Démarre le serveur en mode dev
npm run lint         # Vérifie le code
npm run lint:fix     # Corrige automatiquement
```

### Base de données
```bash
npm run migrate      # Exécute toutes les migrations
npm run migrate:rollback  # Rollback dernière migration
npm run seed         # Charge les données de test
```

### Tests
```bash
npm test             # Lance tous les tests
npm run test:watch   # Tests en mode watch
```

## 📁 Structure du projet

```
backend/
├── src/
│   ├── config/          # Configuration (DB, Redis, Firebase, etc.)
│   ├── controllers/     # Contrôleurs API
│   │   ├── admin/       # Contrôleurs admin
│   │   └── vendor/      # Contrôleurs vendor
│   ├── middleware/      # Middlewares Express
│   ├── models/          # Modèles de données
│   ├── routes/          # Routes API
│   │   ├── admin/       # Routes admin
│   │   └── vendor/      # Routes vendor
│   ├── services/        # Services métier
│   └── utils/           # Utilitaires
├── migrations/          # Migrations Knex.js
├── seeds/               # Seeds de données
├── tests/               # Tests unitaires
└── docs/                # Documentation
```

## 🔒 Sécurité

### Fichiers à ne JAMAIS committer :
- `.env` et toutes ses variantes
- `firebase-service-account*.json`
- Certificats SSL (`*.crt`, `*.key`, `*.pem`)
- Backups de base de données (`*.sql`, `*.dump`)
- Fichiers de logs sensibles

### Bonnes pratiques :
1. Toujours utiliser `.env.example` comme modèle
2. Ne jamais partager les secrets dans les commits
3. Utiliser des variables d'environnement pour toutes les configurations sensibles
4. Vérifier `.gitignore` avant chaque commit

## 🤝 Workflow Git

### Branches principales :
- `main` : Branche de production (stable)
- `develop` : Branche de développement

### Créer une nouvelle fonctionnalité :
```bash
# Créer une branche depuis main
git checkout -b feature/nom-de-la-fonctionnalite

# Travailler et commiter
git add .
git commit -m "feat: description de la fonctionnalité"

# Pousser vers GitHub
git push origin feature/nom-de-la-fonctionnalite

# Créer une Pull Request sur GitHub
```

### Convention de commits :
- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `docs:` : Documentation
- `style:` : Formatage (pas de changement de code)
- `refactor:` : Refactoring
- `test:` : Tests
- `chore:` : Maintenance

## 📞 Support

Pour toute question :
1. Consultez la documentation dans `docs/`
2. Vérifiez `SETUP.md` pour la configuration
3. Consultez `AUDIT/RAPPORT-COMPLET.md` pour comprendre l'architecture
4. Contactez l'équipe via GitHub Issues ou Slack

## 🚨 Problèmes courants

### Erreur de connexion à la base de données
- Vérifier que PostgreSQL est démarré
- Vérifier `DATABASE_URL` dans `.env`
- Vérifier que la base de données existe : `createdb afrikmode_db`

### Erreur de migration
```bash
# Rollback et réessayer
npm run migrate:rollback
npm run migrate
```

### Port déjà utilisé
- Changer `PORT` dans `.env`
- Ou arrêter le processus utilisant le port 5000

### Erreurs de dépendances
```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

