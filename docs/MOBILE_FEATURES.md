# 📱 FONCTIONNALITÉS MOBILES - AfrikMode

## Vue d'ensemble

Le système de fonctionnalités mobiles d'AfrikMode offre une suite complète d'outils pour les applications mobiles natives (iOS et Android), incluant les notifications push, le deep linking et la gestion hors ligne.

## 🔥 Fonctionnalités principales

### 1. Notifications Push (Firebase FCM)
- **Gestion des tokens FCM** : Enregistrement et suppression des appareils
- **Notifications contextuelles** : Messages personnalisés selon l'action utilisateur
- **Segmentation avancée** : Ciblage par plateforme, localisation, préférences
- **Analytics détaillées** : Suivi des envois, livraisons et interactions

### 2. Deep Linking Universal
- **Liens courts personnalisés** : Génération automatique de codes courts
- **Universal Links iOS** : Configuration Apple App Site Association
- **App Links Android** : Configuration Digital Asset Links
- **Analytics de partage** : Suivi des clics et conversions

### 3. Mode hors ligne
- **Cache intelligent** : Stockage Redis avec compression
- **Synchronisation bidirectionnelle** : Upload des changements locaux
- **Gestion des préférences** : Configuration personnalisée du cache
- **Résolution des conflits** : Stratégies de merge automatique

## 📊 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   API Routes    │    │   Services      │
│                 │    │                 │    │                 │
│ • FCM Client    │◄──►│ /mobile/push    │◄──►│ mobilePushSvc   │
│ • Deep Links    │    │ /mobile/link    │    │ deepLinkSvc     │
│ • Offline Sync  │    │ /mobile/offline │    │ offlineCacheSvc │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │     Redis       │    │   Firebase      │
│                 │    │                 │    │                 │
│ • device_tokens │    │ • Cache data    │    │ • FCM Service   │
│ • deep_links    │    │ • Sync queue    │    │ • Message Queue │
│ • push_logs     │    │ • Analytics     │    │ • Delivery Rpt  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Installation et Configuration

### 1. Variables d'environnement

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=afrikmode-mobile
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@afrikmode.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=1234567890

# Deep Link Configuration
DEEP_LINK_DOMAIN=afkmd.app
DEEP_LINK_WEB_FALLBACK=https://afrikmode.com
DEEP_LINK_IOS_BUNDLE_ID=com.afrikmode.app
DEEP_LINK_ANDROID_PACKAGE=com.afrikmode.android

# App Configuration
MOBILE_APP_STORE_URL=https://apps.apple.com/app/afrikmode/id123456
GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=com.afrikmode.android
```

### 2. Bases de données

```sql
-- Exécuter la migration
npm run migrate:latest

-- Tables créées :
-- • device_tokens (tokens FCM)
-- • deep_links (liens partagés)
-- • deep_link_clicks (analytics)
-- • push_notification_logs (historique notifications)
-- • offline_cache_logs (gestion cache)
-- • offline_sync_queue (synchronisation)
-- • mobile_user_preferences (préférences)
```

### 3. Configuration iOS (Universal Links)

Fichier `/.well-known/apple-app-site-association` :
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.afrikmode.app",
        "paths": ["/l/*", "/app/*", "/product/*", "/store/*"]
      }
    ]
  }
}
```

### 4. Configuration Android (App Links)

Fichier `/.well-known/assetlinks.json` :
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.afrikmode.android",
      "sha256_cert_fingerprints": ["SHA256_FINGERPRINT"]
    }
  }
]
```

## 📡 API Endpoints

### Notifications Push

```javascript
// Enregistrer un token FCM
POST /api/mobile/push/register
{
  "token": "fcm_token_here",
  "deviceInfo": {
    "platform": "ios|android|web",
    "appVersion": "1.0.0",
    "deviceId": "unique_device_id"
  }
}

// Supprimer un token
POST /api/mobile/push/unregister
{
  "token": "fcm_token_here"
}

// Notification contextuelle
POST /api/mobile/push/contextual
{
  "notificationType": "order_confirmed",
  "context": {
    "orderNumber": "ORD-123456",
    "amount": 89.99
  }
}
```

### Deep Linking

```javascript
// Créer un lien de partage
POST /api/mobile/deeplink/create
{
  "type": "product",
  "targetId": "product-uuid",
  "options": {
    "campaign": "summer_sale",
    "utm_source": "social",
    "utm_medium": "instagram"
  }
}

// Résolution automatique (redirection)
GET /api/mobile/l/{shortCode}
// Redirige vers l'app ou le web selon le contexte
```

### Cache hors ligne

```javascript
// Mettre en cache des données
POST /api/mobile/offline/cache
{
  "dataType": "products",
  "options": {
    "limit": 50,
    "category": "clothing",
    "includeImages": true
  }
}

// Synchroniser les changements
POST /api/mobile/offline/sync
{
  "changes": [
    {
      "id": "change-1",
      "type": "wishlist_add",
      "data": { "productId": "uuid" },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}

// Récupérer le cache
GET /api/mobile/offline/cache/products
```

## 🎯 Utilisation côté mobile

### iOS (Swift)

```swift
import Firebase
import UserNotifications

// Configuration FCM
Messaging.messaging().token { token, error in
    if let token = token {
        // Envoyer le token à l'API
        registerFCMToken(token)
    }
}

// Gestion des deep links
func application(_ application: UIApplication, 
                continue userActivity: NSUserActivity, 
                restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
        // Traiter le deep link
        return handleDeepLink(url)
    }
    return false
}

// Cache hors ligne
class OfflineManager {
    func cacheEssentialData() {
        // Appeler l'API pour mettre en cache
        APIClient.shared.cacheForOffline(dataType: "products")
    }
    
    func syncOfflineChanges() {
        let changes = getLocalChanges()
        APIClient.shared.syncOfflineChanges(changes)
    }
}
```

### Android (Kotlin)

```kotlin
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.RemoteMessage

class AfrikModeFirebaseService : FirebaseMessagingService() {
    
    override fun onNewToken(token: String) {
        // Envoyer le nouveau token à l'API
        registerFCMToken(token)
    }
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Traiter la notification reçue
        handlePushNotification(remoteMessage)
    }
}

// Gestion des App Links
class MainActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleAppLink(intent)
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleAppLink(intent)
    }
    
    private fun handleAppLink(intent: Intent?) {
        val data = intent?.data
        if (data != null && data.host == "afkmd.app") {
            // Traiter le deep link
            processDeepLink(data)
        }
    }
}

// Cache hors ligne
class OfflineRepository {
    suspend fun cacheProducts() {
        val response = api.cacheForOffline("products")
        // Stocker en local avec Room/SQLite
    }
    
    suspend fun syncChanges() {
        val changes = getLocalChanges()
        api.syncOfflineChanges(changes)
    }
}
```

## 📈 Monitoring et Analytics

### Métriques disponibles

```javascript
// Statistiques générales
GET /api/mobile/stats?days=30

// Réponse
{
  "success": true,
  "data": {
    "pushNotifications": {
      "sent": 15420,
      "delivered": 14856,
      "clicked": 3241,
      "deliveryRate": 96.3,
      "clickRate": 21.8
    },
    "deepLinks": {
      "created": 2845,
      "clicked": 8934,
      "conversions": 1247,
      "conversionRate": 14.0
    },
    "offlineCache": {
      "totalCacheSize": "2.3GB",
      "activeUsers": 4521,
      "syncOperations": 18743,
      "syncSuccessRate": 98.7
    }
  }
}
```

### Dashboard de monitoring

- **Taux de livraison** des notifications push par plateforme
- **Performance des deep links** par campagne et source
- **Utilisation du cache** hors ligne par type de données
- **Erreurs et retry** des synchronisations

## 🔧 Configuration avancée

### Optimisation des performances

```javascript
// Configuration Redis pour le cache
const cacheConfig = {
  compression: true,
  maxSize: '100MB',
  ttl: 3600, // 1 heure
  strategies: {
    products: 'lru',
    categories: 'static',
    profile: 'write-through'
  }
};

// Limitation du taux de notifications
const rateLimiting = {
  perUser: {
    daily: 10,
    hourly: 3
  },
  perDevice: {
    daily: 20,
    hourly: 5
  }
};
```

### Personnalisation des notifications

```javascript
// Templates personnalisés
const customTemplates = {
  order_confirmed: {
    title: 'Commande reçue! 🎉',
    body: 'Merci {userName}! Commande #{orderNumber} confirmée.',
    actions: [
      { id: 'track', title: 'Suivre', url: '/orders/{orderId}' },
      { id: 'support', title: 'Support', url: '/support' }
    ]
  }
};
```

## 🛡️ Sécurité

### Authentification
- **JWT obligatoire** pour tous les endpoints sensibles
- **Validation des tokens FCM** avant enregistrement
- **Rate limiting** sur les créations de deep links

### Protection des données
- **Chiffrement des caches** Redis sensibles  
- **Anonymisation** des analytics de deep links
- **Purge automatique** des logs anciens (90 jours)

### Gestion des erreurs
- **Retry automatique** pour les notifications échouées
- **Fallback gracieux** si Firebase est indisponible
- **Logs détaillés** pour le debugging

## 📋 Tests

```bash
# Tests unitaires des services
npm test tests/services/mobilePush.test.js
npm test tests/services/deepLink.test.js
npm test tests/services/offlineCache.test.js

# Tests d'intégration API
npm test tests/routes/mobile.test.js

# Tests E2E avec vraie app mobile
npm run test:e2e:mobile
```

## 🚀 Déploiement

### Prérequis
1. **Projet Firebase** configuré avec FCM
2. **Domaine vérifié** pour les Universal/App Links
3. **Certificats SSL** pour les domaines de deep links
4. **Redis** configuré avec persistance

### Étapes de déploiement
1. Configurer les variables d'environnement
2. Exécuter les migrations de base de données
3. Configurer les fichiers `.well-known`
4. Tester les notifications et deep links
5. Déployer et valider les métriques

---

🎯 **Les fonctionnalités mobiles AfrikMode** offrent une expérience utilisateur moderne et performante, optimisée pour les applications e-commerce natives avec une architecture robuste et évolutive.