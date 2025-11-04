# Backend API - Système de Candidature Vendeur

## 📋 Endpoints Requis

Ce document décrit tous les endpoints backend nécessaires pour le système de candidature vendeur d'AfrikMode.

---

## 🔐 Authentification

Tous les endpoints nécessitent un token JWT valide dans le header :
```
Authorization: Bearer <token>
```

---

## 1️⃣ Vérification d'Éligibilité

### **GET** `/api/vendor/eligibility`

**Description:** Vérifie si l'utilisateur peut postuler pour devenir vendeur

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "eligible": true,
  "message": "Vous êtes éligible pour devenir vendeur"
}
```

**Response 403 - Candidature existante:**
```json
{
  "eligible": false,
  "reason": "existing_application",
  "message": "Vous avez déjà une candidature en cours",
  "application": {
    "id": "app-123",
    "applicationNumber": "VA-20250121-0001",
    "status": "pending",
    "submittedAt": "2025-01-21T10:00:00Z"
  }
}
```

**Response 403 - Boutique existante:**
```json
{
  "eligible": false,
  "reason": "existing_store",
  "message": "Vous avez déjà une boutique active",
  "store": {
    "id": "store-456",
    "name": "Ma Boutique",
    "status": "active",
    "slug": "ma-boutique"
  }
}
```

**Response 403 - Email non vérifié:**
```json
{
  "eligible": false,
  "reason": "email_not_verified",
  "message": "Veuillez vérifier votre email avant de postuler"
}
```

---

## 2️⃣ Soumission de Candidature

### **POST** `/api/stores`

**Description:** Créer une nouvelle candidature vendeur

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```typescript
{
  // Informations boutique
  shopName: string,
  description: string,
  businessType: "individual" | "company",
  category: string,
  
  // Contact
  email: string,
  phone: string,
  country: string,
  city: string,
  address: string,
  postalCode: string,
  
  // Légal
  legalName: string,
  registrationNumber: string,
  taxId: string,
  
  // Documents (fichiers)
  businessLicense: File,
  idDocument: File,
  proofOfAddress: File,
  taxCertificate?: File,
  
  // Métadonnées
  language: "fr" | "en",
  acceptedTerms: boolean
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Candidature soumise avec succès",
  "application": {
    "id": "app-789",
    "applicationNumber": "VA-20250121-0002",
    "status": "pending",
    "shopName": "Ma Nouvelle Boutique",
    "submittedAt": "2025-01-21T14:30:00Z"
  }
}
```

**Response 400 - Données invalides:**
```json
{
  "error": "validation_error",
  "message": "Données invalides",
  "fields": {
    "shopName": "Le nom de boutique est requis",
    "email": "Email invalide",
    "businessLicense": "Document requis"
  }
}
```

**Response 409 - Candidature existante:**
```json
{
  "error": "application_exists",
  "message": "Vous avez déjà une candidature en cours",
  "existingApplication": {
    "id": "app-123",
    "applicationNumber": "VA-20250121-0001",
    "status": "under_review"
  }
}
```

**Response 413 - Fichier trop volumineux:**
```json
{
  "error": "file_too_large",
  "message": "Le fichier dépasse la taille maximale autorisée (5MB)",
  "file": "businessLicense.pdf"
}
```

**Response 422 - Format de fichier invalide:**
```json
{
  "error": "invalid_file_format",
  "message": "Format de fichier non supporté. Formats acceptés: PDF, JPG, PNG",
  "file": "idDocument.exe"
}
```

---

## 3️⃣ Récupération du Statut

### **GET** `/api/vendor/application/status`

**Description:** Obtenir le statut de la candidature de l'utilisateur connecté

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
applicationNumber?: string  // Optionnel, pour récupérer une candidature spécifique
```

**Response 200:**
```json
{
  "id": "app-789",
  "applicationNumber": "VA-20250121-0002",
  "shopName": "Ma Nouvelle Boutique",
  "status": "under_review",
  "submittedAt": "2025-01-21T14:30:00Z",
  "lastUpdatedAt": "2025-01-21T15:00:00Z",
  "reviewedAt": null,
  "reviewedBy": null,
  "rejectionReason": null,
  "storeId": null,
  "adminMessages": [
    {
      "id": "msg-1",
      "message": "Votre candidature a été reçue et est en cours d'examen.",
      "type": "info",
      "createdAt": "2025-01-21T14:30:00Z",
      "isRead": true
    }
  ]
}
```

**Response 200 - Candidature approuvée:**
```json
{
  "id": "app-789",
  "applicationNumber": "VA-20250121-0002",
  "shopName": "Ma Nouvelle Boutique",
  "status": "approved",
  "submittedAt": "2025-01-21T14:30:00Z",
  "lastUpdatedAt": "2025-01-22T10:00:00Z",
  "reviewedAt": "2025-01-22T10:00:00Z",
  "reviewedBy": "Admin Jean Dupont",
  "rejectionReason": null,
  "storeId": "store-999",
  "adminMessages": [
    {
      "id": "msg-1",
      "message": "Votre candidature a été reçue et est en cours d'examen.",
      "type": "info",
      "createdAt": "2025-01-21T14:30:00Z",
      "isRead": true
    },
    {
      "id": "msg-2",
      "message": "Félicitations ! Votre boutique a été approuvée.",
      "type": "success",
      "createdAt": "2025-01-22T10:00:00Z",
      "isRead": false
    }
  ]
}
```

**Response 200 - Candidature rejetée:**
```json
{
  "id": "app-789",
  "applicationNumber": "VA-20250121-0002",
  "shopName": "Ma Nouvelle Boutique",
  "status": "rejected",
  "submittedAt": "2025-01-21T14:30:00Z",
  "lastUpdatedAt": "2025-01-22T11:00:00Z",
  "reviewedAt": "2025-01-22T11:00:00Z",
  "reviewedBy": "Admin Marie Martin",
  "rejectionReason": "Les documents fournis sont incomplets. Le certificat fiscal est manquant et la pièce d'identité n'est pas lisible.",
  "storeId": null,
  "adminMessages": [
    {
      "id": "msg-3",
      "message": "Votre candidature a été examinée. Malheureusement, elle ne peut être acceptée dans son état actuel.",
      "type": "error",
      "createdAt": "2025-01-22T11:00:00Z",
      "isRead": false
    }
  ]
}
```

**Response 404:**
```json
{
  "error": "not_found",
  "message": "Aucune candidature trouvée pour cet utilisateur"
}
```

---

## 4️⃣ Mise à Jour de Candidature

### **PATCH** `/api/vendor/application/:id`

**Description:** Mettre à jour une candidature existante (seulement si status = pending ou info_required)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
```
id: string  // ID de la candidature
```

**Body (FormData) - Tous les champs sont optionnels:**
```typescript
{
  shopName?: string,
  description?: string,
  phone?: string,
  address?: string,
  businessLicense?: File,  // Nouveau document
  idDocument?: File,
  proofOfAddress?: File,
  taxCertificate?: File
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Candidature mise à jour avec succès",
  "application": {
    "id": "app-789",
    "applicationNumber": "VA-20250121-0002",
    "status": "pending",
    "lastUpdatedAt": "2025-01-22T14:00:00Z"
  }
}
```

**Response 403 - Statut invalide:**
```json
{
  "error": "cannot_edit",
  "message": "Impossible de modifier une candidature avec le statut 'approved'",
  "currentStatus": "approved"
}
```

**Response 404:**
```json
{
  "error": "not_found",
  "message": "Candidature introuvable"
}
```

---

## 5️⃣ Historique de Candidature

### **GET** `/api/vendor/application/:id/history`

**Description:** Obtenir l'historique complet des changements de statut

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
```
id: string  // ID de la candidature
```

**Response 200:**
```json
{
  "history": [
    {
      "id": "hist-1",
      "status": "submitted",
      "message": "Candidature soumise",
      "date": "2025-01-21T14:30:00Z",
      "author": "Système"
    },
    {
      "id": "hist-2",
      "status": "under_review",
      "message": "Candidature prise en charge pour examen",
      "date": "2025-01-21T15:00:00Z",
      "author": "Admin Jean Dupont"
    },
    {
      "id": "hist-3",
      "status": "info_required",
      "message": "Informations supplémentaires requises : certificat fiscal manquant",
      "date": "2025-01-22T09:00:00Z",
      "author": "Admin Jean Dupont"
    },
    {
      "id": "hist-4",
      "status": "updated",
      "message": "Documents mis à jour par le candidat",
      "date": "2025-01-22T14:00:00Z",
      "author": "Ma Nouvelle Boutique"
    },
    {
      "id": "hist-5",
      "status": "approved",
      "message": "Candidature approuvée - Boutique activée",
      "date": "2025-01-22T16:00:00Z",
      "author": "Admin Marie Martin"
    }
  ]
}
```

---

## 6️⃣ Téléchargement de Documents Supplémentaires

### **POST** `/api/vendor/application/:id/documents`

**Description:** Ajouter des documents supplémentaires à une candidature existante

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
```
id: string  // ID de la candidature
```

**Body (FormData):**
```typescript
{
  documentType: "business_license" | "id_document" | "proof_of_address" | "tax_certificate" | "other",
  file: File,
  description?: string
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Document ajouté avec succès",
  "document": {
    "id": "doc-123",
    "type": "tax_certificate",
    "filename": "certificat_fiscal.pdf",
    "size": 245600,
    "uploadedAt": "2025-01-22T14:00:00Z"
  }
}
```

---

## 7️⃣ Marquer Message comme Lu

### **PATCH** `/api/vendor/application/messages/:messageId/read`

**Description:** Marquer un message admin comme lu

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
```
messageId: string  // ID du message
```

**Response 200:**
```json
{
  "success": true,
  "message": "Message marqué comme lu"
}
```

---

## 🛡️ Endpoints Admin (Bonus)

### **GET** `/api/admin/vendor-applications`

**Description:** Liste toutes les candidatures (pour admin uniquement)

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
```
status?: "pending" | "under_review" | "info_required" | "approved" | "rejected" | "all"
page?: number
limit?: number
sortBy?: "submittedAt" | "lastUpdatedAt"
sortOrder?: "asc" | "desc"
```

**Response 200:**
```json
{
  "applications": [
    {
      "id": "app-789",
      "applicationNumber": "VA-20250121-0002",
      "shopName": "Ma Nouvelle Boutique",
      "applicantName": "Jean Martin",
      "applicantEmail": "jean@example.com",
      "status": "pending",
      "submittedAt": "2025-01-21T14:30:00Z",
      "lastUpdatedAt": "2025-01-21T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### **PATCH** `/api/admin/vendor-applications/:id/approve`

**Description:** Approuver une candidature

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "message": "Félicitations ! Votre boutique est maintenant active."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Candidature approuvée",
  "storeId": "store-999"
}
```

---

### **PATCH** `/api/admin/vendor-applications/:id/reject`

**Description:** Rejeter une candidature

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "reason": "Les documents fournis sont incomplets ou invalides.",
  "message": "Votre candidature ne peut être acceptée pour le moment."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Candidature rejetée"
}
```

---

### **PATCH** `/api/admin/vendor-applications/:id/request-info`

**Description:** Demander des informations supplémentaires

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "message": "Merci de fournir votre certificat fiscal et une pièce d'identité lisible.",
  "requiredDocuments": ["tax_certificate", "id_document"]
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Demande d'informations envoyée"
}
```

---

## 📧 Notifications Email (Déclencheurs)

### Événements déclenchant des emails :

1. **Candidature soumise** (`POST /api/stores`)
   - Email à : Candidat
   - Template : `vendor_application_received`

2. **Candidature approuvée** (`PATCH /api/admin/.../approve`)
   - Email à : Candidat
   - Template : `vendor_application_approved`

3. **Candidature rejetée** (`PATCH /api/admin/.../reject`)
   - Email à : Candidat
   - Template : `vendor_application_rejected`

4. **Informations requises** (`PATCH /api/admin/.../request-info`)
   - Email à : Candidat
   - Template : `vendor_application_info_required`

---

## 🗄️ Modèle de Données

### Table: `vendor_applications`

```sql
CREATE TABLE vendor_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Informations boutique
  shop_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  
  -- Contact
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  
  -- Légal
  legal_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  
  -- Statut
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'info_required', 'approved', 'rejected')),
  
  -- Dates
  submitted_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  
  -- Examen
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Boutique créée (si approuvée)
  store_id UUID REFERENCES stores(id),
  
  -- Métadonnées
  language VARCHAR(10) DEFAULT 'fr',
  accepted_terms BOOLEAN DEFAULT false,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_submitted_at (submitted_at)
);
```

### Table: `vendor_application_documents`

```sql
CREATE TABLE vendor_application_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_application_id (application_id)
);
```

### Table: `vendor_application_messages`

```sql
CREATE TABLE vendor_application_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  author_id UUID REFERENCES users(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_application_id (application_id),
  INDEX idx_is_read (is_read)
);
```

### Table: `vendor_application_history`

```sql
CREATE TABLE vendor_application_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  author_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_application_id (application_id),
  INDEX idx_created_at (created_at)
);
```

---

## 🔒 Règles de Sécurité

1. **Authentification obligatoire** pour tous les endpoints
2. **Validation des fichiers** : 
   - Types acceptés : PDF, JPG, PNG
   - Taille max : 5MB par fichier
   - Scan antivirus recommandé
3. **Rate limiting** : Max 5 soumissions par jour par utilisateur
4. **Validation des données** : Utiliser Joi ou similaire
5. **Logs d'audit** : Enregistrer toutes les actions admin
6. **CORS** : Restreindre aux domaines autorisés
7. **CSRF protection** : Tokens CSRF pour les formulaires

---

## 📊 Codes d'Erreur Standardisés

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Données invalides ou manquantes |
| 401 | Unauthorized | Token JWT manquant ou invalide |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource introuvable |
| 409 | Conflict | Candidature déjà existante |
| 413 | Payload Too Large | Fichier trop volumineux |
| 422 | Unprocessable Entity | Validation échouée |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

---

## 🧪 Tests Postman / Insomnia

### Collection à créer :

```
📁 Vendor System
  📄 Check Eligibility (GET)
  📄 Submit Application (POST)
  📄 Get Application Status (GET)
  📄 Update Application (PATCH)
  📄 Get Application History (GET)
  📄 Upload Additional Document (POST)
  📄 Mark Message as Read (PATCH)
  
📁 Admin - Vendor Applications
  📄 List All Applications (GET)
  📄 Approve Application (PATCH)
  📄 Reject Application (PATCH)
  📄 Request Info (PATCH)
```

---

## 📝 Notes d'Implémentation

### Gestion des Fichiers
- Utiliser un service de stockage cloud (AWS S3, Azure Blob, Google Cloud Storage)
- Générer des URLs signées pour l'accès temporaire
- Compresser les images automatiquement
- Conserver les fichiers originaux + versions optimisées

### Génération du Numéro de Candidature
```javascript
function generateApplicationNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  return `VA-${year}${month}${day}-${sequence}`;
}
```

### Workflow de Statut
```
pending → under_review → info_required (optionnel) → approved / rejected
```

---

**Date de création :** 21 janvier 2025  
**Version :** 1.0.0  
**Statut :** 📋 Spécification complète - Prêt pour implémentation
