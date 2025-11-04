
# 🔥 Guide de Configuration Firebase pour AfrikMode

Ce guide vous explique comment configurer Firebase Cloud Messaging (FCM) pour les notifications push d'AfrikMode.

## 📋 Étapes de configuration

### 1. Créer un projet Firebase

1. **Accédez à la Firebase Console**
   - Allez sur https://console.firebase.google.com
   - Connectez-vous avec votre compte Google

2. **Créer un nouveau projet**
   - Cliquez sur "Ajouter un projet"
   - Nom du projet : `AfrikMode` (ou `afrikmode-dev` pour le développement)
   - Activez Google Analytics (optionnel)

3. **Configurer les applications**
   - Ajoutez une application **Android** :
     - Nom du package : `com.afrikmode.app`
     - Téléchargez le fichier `google-services.json`
   
   - Ajoutez une application **iOS** :
     - Bundle ID : `com.afrikmode.app`
     - Téléchargez le fichier `GoogleService-Info.plist`
   
   - Ajoutez une application **Web** :
     - Nom : `AfrikMode Web`
     - Récupérez la configuration Web

### 2. Générer la clé de service

1. **Accéder aux paramètres du projet**
   - Dans la Firebase Console, cliquez sur l'icône ⚙️ > "Paramètres du projet"

2. **Aller dans "Comptes de service"**
   - Onglet "Comptes de service"
   - Section "SDK Admin Firebase"

3. **Générer une nouvelle clé privée**
   - Cliquez sur "Générer une nouvelle clé privée"
   - Un fichier JSON sera téléchargé (ex: `afrikmode-firebase-adminsdk-xyz123.json`)

4. **⚠️ Sécuriser le fichier**
   - **NE JAMAIS** commiter ce fichier dans Git
   - Stockez-le dans un lieu sécurisé
   - Ajoutez `*firebase*.json` dans votre `.gitignore`

### 3. Configuration dans AfrikMode

#### Option A : Variable d'environnement JSON (Recommandée)

Copiez tout le contenu du fichier JSON dans une variable d'environnement :

```bash
# Dans votre fichier .env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"afrikmode-dev","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-abc123@afrikmode-dev.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-abc123%40afrikmode-dev.iam.gserviceaccount.com"}'
```

#### Option B : Fichier de configuration

1. Placez le fichier JSON dans un dossier sécurisé (ex: `./config/`)
2. Configurez le chemin :

```bash
# Dans votre fichier .env
FIREBASE_SERVICE_ACCOUNT_PATH=./config/afrikmode-firebase-adminsdk.json
```

#### Option C : Variables séparées

```bash
# Dans votre fichier .env
FIREBASE_PROJECT_ID=afrikmode-dev
FIREBASE_PRIVATE_KEY_ID=abc123def456...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@afrikmode-dev.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

### 4. Configuration OneSignal (Optionnel)

Si vous voulez également utiliser OneSignal :

1. **Créer un compte OneSignal**
   - Allez sur https://onesignal.com
   - Créez une nouvelle application

2. **Configurer les plateformes**
   - **Android** : Utilisez votre clé serveur Firebase
   - **iOS** : Uploadez vos certificats push Apple
   - **Web** : Configurez votre domaine

3. **Récupérer les clés**
   ```bash
   # Dans votre fichier .env
   ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
   ONESIGNAL_REST_API_KEY=YOUR_REST_API_KEY_HERE
   ```

### 5. Variables de configuration complètes

Ajoutez ceci à votre fichier `.env` :

```bash
# ===========================================
# NOTIFICATIONS PUSH
# ===========================================

# Firebase (choisir une des 3 options ci-dessus)
FIREBASE_SERVICE_ACCOUNT='VOTRE_JSON_COMPLETE_ICI'

# OneSignal (optionnel)
ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
ONESIGNAL_REST_API_KEY=YOUR_REST_API_KEY

# Configuration générale
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_DEFAULT_SOUND=default
NOTIFICATIONS_DEFAULT_ICON=/icons/notification-icon.png
NOTIFICATIONS_BATCH_SIZE=1000
```

## 🧪 Tester la configuration

### 1. Démarrer le serveur

```bash
npm start
```

Vérifiez dans les logs :
```
✅ Firebase Cloud Messaging initialisé
✅ Configuration Firebase chargée depuis variable d'environnement
✅ Firebase Admin SDK initialisé pour le projet: afrikmode-dev
```

### 2. Tester avec l'endpoint de test

```bash
# Connectez-vous d'abord pour obtenir un token
POST /api/auth/login
{
  "email": "admin@afrikmode.com",
  "password": "votre-password"
}

# Testez les notifications
POST /api/notifications/test
Authorization: Bearer YOUR_TOKEN
```

Si tout fonctionne, vous devriez voir :
```json
{
  "success": true,
  "message": "Notification de test envoyée",
  "data": {
    "success": true,
    "notificationId": "uuid-123...",
    "results": [...]
  }
}
```

## 📱 Intégration dans les apps mobiles

### Android (React Native / Flutter)

1. **Ajoutez le fichier `google-services.json`** dans `android/app/`

2. **Configurez les permissions** dans `android/app/src/main/AndroidManifest.xml` :
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
```

3. **Enregistrez le token** :
```javascript
// Récupérer le token FCM
const token = await messaging().getToken();

// L'envoyer au backend
fetch('/api/notifications/device-tokens', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: token,
    deviceId: DeviceInfo.getUniqueId(),
    platform: 'android',
    appVersion: '1.0.0',
    deviceModel: DeviceInfo.getModel(),
    osVersion: DeviceInfo.getSystemVersion(),
    language: 'fr'
  })
});
```

### iOS (React Native / Flutter)

1. **Ajoutez le fichier `GoogleService-Info.plist`** dans le projet iOS

2. **Configurez les capabilities** :
   - Push Notifications
   - Background App Refresh

3. **Gérez les permissions** :
```javascript
// Demander la permission
const permission = await messaging().requestPermission();
if (permission === messaging.AuthorizationStatus.AUTHORIZED) {
  const token = await messaging().getToken();
  // Envoyer au backend comme pour Android
}
```

### Web (Progressive Web App)

1. **Configurez le Service Worker** :
```javascript
// firebase-messaging-sw.js
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

const firebaseConfig = {
  // Votre config web Firebase
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
```

2. **Enregistrez pour les notifications** :
```javascript
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
const token = await getToken(messaging, {
  vapidKey: 'VOTRE_VAPID_KEY'
});

// Envoyer au backend
```

## 🔧 Dépannage

### Erreurs communes

1. **"Firebase non configuré"**
   - Vérifiez que `FIREBASE_SERVICE_ACCOUNT` est défini
   - Vérifiez la validité du JSON

2. **"messaging/registration-token-not-registered"**
   - Le token FCM est invalide ou expiré
   - Regenerez et réenregistrez le token

3. **"Firebase project not found"**
   - Vérifiez le `project_id` dans votre configuration
   - Assurez-vous que le projet existe dans Firebase Console

### Logs utiles

Activez les logs détaillés :
```bash
DEBUG=firebase* npm start
```

## 🚀 Mise en production

### 1. Projet Firebase de production

- Créez un projet séparé : `afrikmode-prod`
- Générez une nouvelle clé de service
- Configurez les variables d'environnement de production

### 2. Sécurité

- Utilisez des secrets Kubernetes/Docker pour les clés
- Activez HTTPS obligatoire
- Configurez les domaines autorisés dans Firebase
- Limitez les IPs autorisées si possible

### 3. Monitoring

- Surveillez les métriques Firebase Console
- Utilisez l'endpoint `/api/notifications/stats` pour les statistiques
- Configurez des alertes pour les échecs de notification

## 📊 Utilisation avancée

### Notifications planifiées

```javascript
// Programmer une notification pour plus tard
POST /api/notifications/schedule
{
  "title": "Vente Flash dans 1 heure !",
  "body": "Préparez-vous, ça va démarrer !",
  "scheduledAt": "2024-12-25T20:00:00Z",
  "userIds": ["user1", "user2"]
}
```

### Segmentation utilisateurs

```javascript
// Broadcast avec critères
POST /api/notifications/broadcast
{
  "title": "Offre spéciale clients premium",
  "body": "Profitez de 30% de réduction",
  "targetRoles": ["premium_customer"],
  "targetLanguage": "fr",
  "lastActiveAfter": "2024-12-01T00:00:00Z"
}
```

### Analytics et suivi

```javascript
// Statistiques détaillées
GET /api/notifications/stats?period=7d

{
  "success": true,
  "data": {
    "overview": {
      "total": 1500,
      "sent": 1485,
      "read": 892,
      "clicked": 234,
      "deliveryRate": "99.00",
      "openRate": "60.10",
      "clickRate": "15.76"
    }
  }
}
```

---

✅ **Configuration terminée !** 

Votre système de notifications push AfrikMode est maintenant opérationnel. Les notifications seront automatiquement envoyées lors des événements importants (commandes, paiements, nouveaux produits, etc.).

Pour toute question, consultez les logs du serveur ou testez avec l'endpoint `/api/notifications/test`.