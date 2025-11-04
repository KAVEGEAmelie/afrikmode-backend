# 🔥 GUIDE COMPLET FIREBASE POUR AFRIKMODE

## 📋 Étapes de configuration Firebase

### 1. Créer le projet Firebase

1. **Aller sur [Firebase Console](https://console.firebase.google.com/)**
2. **Cliquer sur "Ajouter un projet"**
3. **Nom du projet :** `afrikmode-notifications`
4. **Activer Google Analytics :** Oui (recommandé)
5. **Sélectionner le compte Analytics**
6. **Créer le projet**

### 2. Configurer Firebase Cloud Messaging (FCM)

1. **Dans votre projet Firebase, aller dans :**
   - **Project Settings** (⚙️ en haut à gauche)
   - **Cloud Messaging**

2. **Activer Firebase Cloud Messaging API :**
   - Cliquer sur "Enable Firebase Cloud Messaging API"
   - Accepter les conditions

### 3. Créer les applications

#### **Application Android**
1. **Ajouter une application → Android**
2. **Package Android :** `com.afrikmode.android`
3. **Nom de l'app :** `AfrikMode Android`
4. **SHA-1** : Laisser vide pour l'instant
5. **Télécharger google-services.json**

#### **Application iOS** 
1. **Ajouter une application → iOS**
2. **Bundle ID :** `com.afrikmode.app`
3. **Nom de l'app :** `AfrikMode iOS`
4. **App Store ID :** Laisser vide pour l'instant
5. **Télécharger GoogleService-Info.plist**

### 4. Service Account (IMPORTANT!)

1. **Dans votre projet Firebase, cliquez sur l'icône ⚙️ (Paramètres) → Project Settings**
2. **Allez dans l'onglet "Service Accounts"**
3. **Cliquez sur "Generate new private key"**
4. **Téléchargez le fichier JSON**
5. **Renommez le fichier en :** `firebase-service-account.json`
6. **Placez-le dans :** `a:\porjets\porjet-thesymo\backend\firebase-service-account.json`

⚠️ **ATTENTION:** Ce fichier contient des clés secrètes - ne le partagez JAMAIS !

## 📁 Structure des fichiers Firebase

Votre backend devrait avoir :
```
backend/
├── firebase-service-account.json  ← Fichier secret !
├── .env                          ← Configuration
└── src/config/firebase.js        ← Notre configuration
```

## ⚠️ SÉCURITÉ IMPORTANTE

- **JAMAIS** commit `firebase-service-account.json` sur Git
- Ajouter à `.gitignore`
- En production, utiliser des variables d'environnement