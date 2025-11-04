# Guide de Configuration Email - AfrikMode

## Problème Actuel
Les emails de vérification ne sont pas envoyés lors de l'inscription des utilisateurs.

## Solution : Configuration Gmail

### 1. Activer l'Authentification à 2 Facteurs
1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. Sécurité → Authentification à 2 facteurs
3. Activez l'authentification à 2 facteurs

### 2. Générer un App Password
1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. Sécurité → Mots de passe des applications
3. Sélectionnez "Mail" et votre appareil
4. Générez le mot de passe (format: xxxx xxxx xxxx xxxx)
5. **IMPORTANT** : Copiez ce mot de passe, il ne sera affiché qu'une fois

### 3. Mettre à Jour la Configuration
Modifiez le fichier `backend/config.env` :

```env
# Configuration email Gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=votre-email@gmail.com
MAIL_PASS=votre-app-password-ici  # Le mot de passe généré à l'étape 2
MAIL_FROM=noreply@afrikmode.com
MAIL_FROM_NAME=AfrikMode
MAIL_DEBUG=true
```

### 4. Redémarrer le Serveur
```bash
cd backend
npm start
```

### 5. Tester l'Envoi d'Email
1. Créez un nouveau compte sur l'application
2. Vérifiez votre boîte email (et le dossier spam)
3. Cliquez sur le lien de vérification

## Vérification du Fonctionnement

### Logs à Surveiller
Dans la console du serveur, vous devriez voir :
```
📧 ===== ENVOI EMAIL DE VÉRIFICATION =====
📨 Destinataire: user@example.com
👤 Nom: User Name
🔑 Token: abc123...
🔗 URL de vérification: http://localhost:4200/verify-email?token=...
🔌 Vérification de la connexion SMTP...
✅ Connexion SMTP vérifiée
✅ Email de vérification envoyé avec succès !
📬 Message ID: <message-id>
📊 Réponse serveur: 250 2.0.0 OK
```

### En Cas d'Erreur
Si vous voyez des erreurs comme :
- `Invalid login: 535-5.7.8 Username and Password not accepted`
- `Authentication failed`

**Solutions :**
1. Vérifiez que l'App Password est correct
2. Assurez-vous que l'authentification à 2 facteurs est activée
3. Vérifiez que l'email dans `MAIL_USER` correspond à votre compte Gmail

## Alternative : Autres Services Email

Si Gmail ne fonctionne pas, vous pouvez utiliser :

### SendGrid
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASS=votre-api-key-sendgrid
```

### Mailgun
```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USER=votre-sandbox-mailgun
MAIL_PASS=votre-password-mailgun
```

## Test Rapide

Pour tester la configuration email :
```bash
cd backend
node -e "
const emailService = require('./src/services/emailService');
emailService.sendVerificationEmail('test@example.com', 'test-token', 'Test User')
  .then(() => console.log('✅ Email envoyé'))
  .catch(err => console.error('❌ Erreur:', err.message));
"
```

## Notes Importantes

1. **Sécurité** : Ne jamais commiter les mots de passe dans le code
2. **Production** : Utilisez des variables d'environnement sécurisées
3. **Limites** : Gmail a des limites d'envoi (500 emails/jour pour les comptes gratuits)
4. **Spam** : Les emails peuvent arriver dans le dossier spam

## Support

Si le problème persiste :
1. Vérifiez les logs du serveur
2. Testez avec une autre adresse email
3. Vérifiez les paramètres de sécurité Gmail
4. Consultez la documentation Nodemailer

























