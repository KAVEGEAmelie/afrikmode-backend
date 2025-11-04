# INSTRUCTIONS FIREBASE SERVICE ACCOUNT

## 🔥 Pour obtenir votre fichier service account Firebase :

1. **Allez sur Firebase Console :** https://console.firebase.google.com
2. **Sélectionnez votre projet :** AfrikMode
3. **Cliquez sur l'icône ⚙️ (Paramètres)** en haut à gauche
4. **Project Settings**
5. **Onglet "Service Accounts"**
6. **Bouton "Generate new private key"**
7. **Téléchargez le fichier JSON**

## 📁 Placement du fichier

Une fois téléchargé, placez le fichier ici :
```
a:\porjets\porjet-thesymo\backend\firebase-service-account.json
```

## 🧪 Test après placement

```bash
node scripts/test-firebase.js
```

## ⚠️ Sécurité

- Ce fichier contient des clés secrètes privées
- Il est déjà dans .gitignore (ne sera pas commité)
- Ne partagez JAMAIS ce fichier
- En production, utilisez des variables d'environnement