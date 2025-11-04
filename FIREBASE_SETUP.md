# 🔥 Guide de Configuration Firebase pour AfrikMode

## 1️⃣ Créer un projet Firebase

### Étape 1: Aller sur Firebase Console
1. Ouvrez votre navigateur et allez sur : **https://console.firebase.google.com**
2. Cliquez sur **"Créer un projet"** ou **"Add project"**

### Étape 2: Configurer le projet
1. **Nom du projet** : `afrikmode-backend` (ou le nom de votre choix)
2. **Google Analytics** : Vous pouvez désactiver pour simplifier (optionnel)
3. Cliquez sur **"Créer le projet"**

### Étape 3: Activer Cloud Messaging
1. Dans le menu de gauche, cliquez sur **"Cloud Messaging"**
2. Si c'est la première fois, Firebase vous demandera d'accepter les conditions

## 2️⃣ Générer la clé de service

### Étape 1: Aller dans les paramètres
1. Cliquez sur l'icône ⚙️ (engrenage) en haut à gauche
2. Sélectionnez **"Paramètres du projet"**

### Étape 2: Créer un compte de service
1. Allez dans l'onglet **"Comptes de service"**
2. Cliquez sur **"Générer une nouvelle clé privée"**
3. Un fichier JSON sera téléchargé automatiquement
4. **GARDEZ CE FICHIER EN SÉCURITÉ !** Il contient vos clés privées

### Étape 3: Structure du fichier JSON
Le fichier ressemble à ceci :
```json
{
  "type": "service_account",
  "project_id": "afrikmode-backend",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xyz@afrikmode-backend.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

## 3️⃣ Configuration dans l'application

### Option A: Variable d'environnement (RECOMMANDÉE)
Dans votre fichier `.env` :
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"afrikmode-backend","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\\nVOTRE_CLE_PRIVEE_ICI\\n-----END PRIVATE KEY-----\\n","client_email":"firebase-adminsdk-xyz@afrikmode-backend.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xyz%40afrikmode-backend.iam.gserviceaccount.com"}'
```

**⚠️ IMPORTANT**: Remplacez les `\n` par `\\n` dans la clé privée pour l'échapper correctement.

### Option B: Fichier de configuration
1. Placez le fichier JSON téléchargé dans `src/config/firebase-service-account.json`
2. Dans votre `.env` :
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/firebase-service-account.json
```

### Option C: Variables séparées
Dans votre `.env` :
```env
FIREBASE_PROJECT_ID=afrikmode-backend
FIREBASE_PRIVATE_KEY_ID=abc123def456
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@afrikmode-backend.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

## 4️⃣ Test de la configuration

### Étape 1: Installer les dépendances
```bash
npm install firebase-admin
```

### Étape 2: Tester la configuration
Utilisez l'endpoint de test :
```bash
POST http://localhost:3000/api/notifications/test
Authorization: Bearer YOUR_JWT_TOKEN
```

### Étape 3: Vérifier les logs
Recherchez dans la console :
```
✅ Firebase Cloud Messaging initialisé
✅ Firebase Admin SDK initialisé pour le projet: afrikmode-backend
```

## 5️⃣ Configuration des applications clientes

### Android
1. Dans Firebase Console, cliquez sur **"Ajouter une app"** > **Android**
2. Entrez le nom du package : `com.afrikmode.app`
3. Téléchargez le fichier `google-services.json`
4. Placez-le dans `android/app/` de votre projet React Native

### iOS
1. Dans Firebase Console, cliquez sur **"Ajouter une app"** > **iOS**
2. Entrez le Bundle ID : `com.afrikmode.app`
3. Téléchargez le fichier `GoogleService-Info.plist`
4. Placez-le dans votre projet iOS

### Web
1. Dans Firebase Console, cliquez sur **"Ajouter une app"** > **Web**
2. Copiez la configuration JavaScript
3. Initialisez Firebase dans votre app web

## 6️⃣ Sécurité et bonnes pratiques

### 🔒 Sécurité
- **JAMAIS** committer le fichier JSON ou les clés privées
- Ajoutez `firebase-service-account.json` dans `.gitignore`
- Utilisez des variables d'environnement sécurisées en production
- Limitez les permissions du compte de service

### 🚀 Production
- Créez des projets séparés pour dev/staging/prod
- Utilisez des services de secrets (AWS Secrets Manager, Azure Key Vault)
- Activez l'audit des logs Firebase
- Configurez les règles de sécurité strictes

## 7️⃣ Dépannage

### Erreur : "Firebase project not found"
- Vérifiez le `project_id` dans la configuration
- Assurez-vous que le projet existe dans Firebase Console

### Erreur : "Invalid private key"
- Vérifiez l'échappement des `\n` dans la clé privée
- Essayez l'option fichier plutôt que variable d'environnement

### Erreur : "Permission denied"
- Vérifiez que Cloud Messaging est activé
- Le compte de service doit avoir les bonnes permissions

### Notifications non reçues
- Vérifiez que l'app cliente est configurée
- Testez d'abord avec l'outil de test Firebase Console
- Vérifiez les tokens de device dans la base de données

## 🎯 Prochaines étapes
1. Configurer Firebase comme décrit ci-dessus
2. Tester avec l'endpoint `/api/notifications/test`
3. Intégrer les applications clientes (Android/iOS/Web)
4. Implémenter les triggers automatiques dans les contrôleurs