# 🎫 Système de Support Client - Guide de Démarrage Rapide

## 📋 Vue d'ensemble

Le système de support client AfrikMode offre :
- ✅ Gestion complète des tickets (CRUD)
- 💬 Chat temps réel avec Socket.io
- 📧 Notifications email automatiques
- 👥 Assignation d'agents
- 📊 Statistiques de performance
- 🚨 Système d'escalade
- ⭐ Évaluations de satisfaction

## 🚀 Installation et Configuration

### 1. Prérequis
```bash
# Vérifiez que vous avez :
- Node.js v16+ installé
- PostgreSQL en cours d'exécution
- Redis pour le cache (optionnel)
```

### 2. Installation des dépendances
```bash
# Dans le dossier backend
npm install

# Vérifiez que Socket.io est installé
npm list socket.io
# Si non installé :
npm install socket.io
```

### 3. Configuration base de données
```bash
# Exécutez les migrations
npx knex migrate:latest

# Vérifiez les nouvelles tables
# Tables créées : tickets, ticket_messages
```

### 4. Variables d'environnement
Vérifiez votre fichier `.env` :
```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=afrikmode
DB_USER=postgres
DB_PASSWORD=your_password

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_password
MAIL_FROM=noreply@afrikmode.com
MAIL_FROM_NAME=AfrikMode Support

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 🧪 Test du Système

Exécutez le test de vérification :
```bash
node test-ticket-system.js
```

Si tout est OK, vous verrez : "🎉 SYSTÈME DE SUPPORT CLIENT PRÊT !"

## 🌐 API Endpoints

### Tickets (Authentification requise)

#### Créer un ticket
```http
POST /api/tickets
Content-Type: application/json
Authorization: Bearer <token>

{
  "subject": "Problème avec ma commande",
  "description": "Je n'ai pas reçu mon produit",
  "category": "order_issue",
  "priority": "medium",
  "orderId": "uuid-order-id"
}
```

#### Liste des tickets
```http
GET /api/tickets?status=open&priority=high&category=product_issue
Authorization: Bearer <token>
```

#### Détails d'un ticket
```http
GET /api/tickets/:id
Authorization: Bearer <token>
```

#### Assigner un ticket (Agents/Admin seulement)
```http
POST /api/tickets/:id/assign
Content-Type: application/json
Authorization: Bearer <token>

{
  "agentId": "uuid-agent-id"
}
```

#### Changer le statut (Agents/Admin seulement)
```http
PUT /api/tickets/:id/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "in_progress",
  "notes": "Traitement en cours"
}
```

#### Ajouter un message
```http
POST /api/tickets/:id/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "Voici ma réponse au problème",
  "type": "customer_message"
}
```

#### Statistiques (Admin seulement)
```http
GET /api/tickets/stats?period=7d&department=technical
Authorization: Bearer <token>
```

## 💬 Chat Temps Réel (Socket.io)

### Connexion client
```javascript
const io = require('socket.io-client');

// Connexion avec authentification JWT
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Rejoindre la conversation d'un ticket
socket.emit('join_ticket', {
  ticketId: 'uuid-ticket-id'
});

// Envoyer un message
socket.emit('send_message', {
  ticketId: 'uuid-ticket-id',
  message: 'Bonjour, j\'ai besoin d\'aide',
  type: 'customer_message'
});

// Écouter les nouveaux messages
socket.on('new_message', (data) => {
  console.log('Nouveau message:', data);
});

// Indicateur de frappe
socket.emit('typing_start', { ticketId: 'uuid-ticket-id' });
socket.emit('typing_stop', { ticketId: 'uuid-ticket-id' });

socket.on('user_typing', (data) => {
  console.log(`${data.userName} est en train d'écrire...`);
});
```

## 📧 Notifications Email

Le système envoie automatiquement des emails pour :

- ✅ **Création de ticket** → Client
- 👨‍💼 **Assignation** → Agent assigné
- 💬 **Nouvelle réponse** → Client
- 💬 **Message client** → Agent
- ✅ **Ticket résolu** → Client (avec demande d'évaluation)
- 🔒 **Ticket fermé** → Client
- 🚨 **Escalade** → Managers

### Templates personnalisables
Les templates se trouvent dans `src/services/ticketEmailTemplates.js`

## 👥 Rôles et Permissions

### Client (`user`)
- Créer des tickets
- Voir ses propres tickets
- Ajouter des messages
- Évaluer la résolution

### Agent Support (`support_agent`)
- Voir tous les tickets
- Se voir assigner des tickets
- Répondre aux clients
- Changer le statut (sauf fermeture)
- Escalader si nécessaire

### Admin (`admin`)
- Toutes les permissions agent
- Assigner des tickets
- Fermer des tickets
- Voir les statistiques
- Accès aux notes internes

## 🚨 Système d'Escalade

Escalade automatique si :
- Ticket ouvert > 48h sans réponse
- Priorité "urgent" > 2h sans traitement
- Client insatisfait (note < 3/5)

Escalade manuelle par les agents avec motif.

## 📊 Statuts des Tickets

- `open` - Nouveau ticket
- `in_progress` - En cours de traitement
- `pending` - En attente de réponse client
- `resolved` - Résolu, en attente de validation
- `closed` - Fermé définitivement
- `escalated` - Escaladé au niveau supérieur

## 🎯 Catégories Supportées

- `order_issue` - Problème de commande
- `product_issue` - Problème produit
- `payment_issue` - Problème de paiement
- `account_issue` - Problème de compte
- `technical_issue` - Problème technique
- `general_inquiry` - Question générale
- `refund_request` - Demande de remboursement
- `other` - Autre

## 🔧 Maintenance et Monitoring

### Logs système
Les logs sont générés dans le dossier `logs/`

### Métriques importantes à surveiller
- Temps de réponse moyen
- Taux de résolution
- Score de satisfaction
- Nombre de tickets escaladés

### Commandes utiles
```bash
# Voir les tickets en attente
psql -d afrikmode -c "SELECT * FROM tickets WHERE status = 'open' AND created_at < NOW() - INTERVAL '24 hours';"

# Statistiques rapides
psql -d afrikmode -c "SELECT status, COUNT(*) FROM tickets GROUP BY status;"
```

## 🐛 Dépannage

### Problèmes courants

1. **Socket.io ne fonctionne pas**
   - Vérifiez que le port n'est pas bloqué
   - Testez avec un client simple

2. **Emails non envoyés**
   - Vérifiez la configuration SMTP
   - Regardez les logs d'erreurs

3. **Erreurs de base de données**
   - Vérifiez que les migrations sont à jour
   - Testez la connexion PostgreSQL

### Support développement
Pour toute question technique, consultez :
- Code source dans `src/`
- Tests dans `tests/`
- Configuration dans `src/config/`

---

**🎉 Félicitations ! Votre système de support client est maintenant opérationnel !**