# 🔥 Guide complet de configuration Firebase pour AfrikMode

## 📋 Étapes de configuration Firebase Console

### 1️⃣ Créer un projet Firebase

1. **Aller sur Firebase Console**
   - Visitez https://console.firebase.google.com
   - Connectez-vous avec votre compte Google

2. **Créer un nouveau projet**
   - Cliquez sur "Ajouter un projet" 
   - Nom du projet : `afrikmode-notifications`
   - Choisir la région : `europe-west1` (Belgique) ou `us-central1`
   - Accepter les conditions

3. **Configurer Google Analytics** (optionnel)
   - Activez Google Analytics si souhaité
   - Choisissez un compte Analytics existant ou créez-en un

### 2️⃣ Configurer Cloud Messaging (FCM)

1. **Activer Cloud Messaging**
   - Dans la console, allez dans "Paramètres du projet" (icône ⚙️)
   - Onglet "Cloud Messaging" 
   - Notez la **Server key** pour OneSignal (si utilisé)

2. **Ajouter les applications**

   **Pour Android :**
   - Cliquez "Ajouter une application" > Android
   - Package name : `com.afrikmode.app`
   - Nickname : `AfrikMode Android`
   - Téléchargez `google-services.json`

   **Pour iOS :**
   - Cliquez "Ajouter une application" > iOS
   - Bundle ID : `com.afrikmode.app`
   - Nickname : `AfrikMode iOS`
   - Téléchargez `GoogleService-Info.plist`

   **Pour Web :**
   - Cliquez "Ajouter une application" > Web
   - Nickname : `AfrikMode Web`
   - Cochez "Configurer Firebase Hosting" si nécessaire
   - Récupérez la configuration Web

### 3️⃣ Générer la clé de service (CRUCIAL)

1. **Aller dans les comptes de service**
   - "Paramètres du projet" > Onglet "Comptes de service"
   - Sélectionnez "Firebase Admin SDK"

2. **Générer une nouvelle clé privée**
   - Cliquez "Générer une nouvelle clé privée"
   - Un fichier JSON sera téléchargé (exemple : `afrikmode-notifications-firebase-adminsdk-abc123-1234567890.json`)

3. **Sécuriser la clé**
   ```bash
   # Déplacer dans un dossier sécurisé
   mkdir /path/to/secure/config
   mv ~/Downloads/afrikmode-*.json /path/to/secure/config/firebase-service-account.json
   chmod 600 /path/to/secure/config/firebase-service-account.json
   ```

### 4️⃣ Configuration dans AfrikMode Backend

**Option 1 : Variable d'environnement (Recommandée)**
```bash
# Dans votre .env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"afrikmode-notifications","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_ICI\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-abc123@afrikmode-notifications.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-abc123%40afrikmode-notifications.iam.gserviceaccount.com"}'
```

**Option 2 : Fichier de configuration**
```bash
# Dans votre .env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/secure/config/firebase-service-account.json
```

**Option 3 : Variables séparées**
```bash
# Dans votre .env
FIREBASE_PROJECT_ID=afrikmode-notifications
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@afrikmode-notifications.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE_ICI\n-----END PRIVATE KEY-----\n"
```

## 🧪 Test de la configuration

### 1️⃣ Démarrer le serveur
```bash
cd backend
npm install firebase-admin
npm start
```

### 2️⃣ Tester l'endpoint de test
```bash
# Connectez-vous d'abord pour avoir un token JWT
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Utilisez le token retourné pour tester les notifications
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3️⃣ Enregistrer un device token de test
```bash
curl -X POST http://localhost:3000/api/notifications/device-tokens \
  -H "Authorization: Bearer VOTRE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-fcm-token-123",
    "deviceId": "test-device-001",
    "platform": "android",
    "appVersion": "1.0.0",
    "deviceModel": "Test Device",
    "osVersion": "Android 12"
  }'
```

## ✅ Checklist finale

- [ ] Projet Firebase créé
- [ ] Applications Android/iOS/Web ajoutées
- [ ] Clé de service téléchargée et sécurisée
- [ ] Variables d'environnement configurées
- [ ] Test endpoint `/api/notifications/test` réussi
- [ ] Device token enregistré avec succès
- [ ] Notification de test reçue
- [ ] Configuration client intégrée
- [ ] Monitoring activé

Une fois cette configuration terminée, les notifications automatiques fonctionneront parfaitement ! 🎉