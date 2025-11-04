# 🎯 DIAGRAMMES UML COMPLETS - AFRIKMODE

## 📋 TABLE DES MATIÈRES

1. [Diagramme des Cas d'Utilisation](#1-diagramme-des-cas-dutilisation)
2. [Diagrammes de Classes](#2-diagrammes-de-classes)
3. [Diagrammes de Séquence](#3-diagrammes-de-séquence)  
4. [Diagrammes d'Activité](#4-diagrammes-dactivité)
5. [Architecture Système](#5-architecture-système)

---

## 1. DIAGRAMME DES CAS D'UTILISATION

### 🎭 Vue d'Ensemble Globale

```plantuml
@startuml AfrikMode_CasUtilisation_Global
!theme aws-orange
title DIAGRAMME CAS D'UTILISATION - AFRIKMODE E-COMMERCE

' Acteurs
actor "👤 Visiteur" as Visiteur
actor "🛒 Client" as Client
actor "✍️ Éditeur" as Editeur  
actor "👔 Manager" as Manager
actor "⚙️ Administrateur" as Admin
actor "🔧 Super Admin" as SuperAdmin

' Systèmes externes
actor "💳 Système Paiement" as PaymentSystem
actor "📧 Système Email" as EmailSystem
actor "📱 Système SMS" as SMSSystem
actor "🚚 Transporteurs" as ShippingSystem

' Système principal
rectangle "AFRIKMODE SYSTEM" {
  
  ' === SECTION A: CONSULTATION PUBLIQUE ===
  package "A. Consultation Publique" {
    usecase "A1. Consulter catalogue" as UC_A1
    usecase "A2. Rechercher produits" as UC_A2
    usecase "A3. Filtrer/Trier" as UC_A3
    usecase "A4. Voir détail produit" as UC_A4
    usecase "A5. Consulter avis clients" as UC_A5
    usecase "A6. Comparer produits" as UC_A6
    usecase "A7. Voir promotions" as UC_A7
    usecase "A8. S'inscrire newsletter" as UC_A8
  }

  ' === SECTION B: GESTION COMPTE CLIENT ===
  package "B. Gestion Compte Client" {
    usecase "B1. Créer compte" as UC_B1
    usecase "B2. Se connecter" as UC_B2
    usecase "B3. Réinitialiser MDP" as UC_B3
    usecase "B4. Vérifier email/SMS" as UC_B4
    usecase "B5. Gérer profil" as UC_B5
    usecase "B6. Gérer adresses" as UC_B6
    usecase "B7. Voir historique commandes" as UC_B7
    usecase "B8. Gérer liste favoris" as UC_B8
    usecase "B9. Configurer notifications" as UC_B9
    usecase "B10. Supprimer compte" as UC_B10
  }

  ' === SECTION C: PROCESSUS ACHAT ===
  package "C. Processus d'Achat" {
    usecase "C1. Ajouter au panier" as UC_C1
    usecase "C2. Modifier panier" as UC_C2
    usecase "C3. Calculer frais livraison" as UC_C3
    usecase "C4. Appliquer coupon/promo" as UC_C4
    usecase "C5. Choisir mode livraison" as UC_C5
    usecase "C6. Finaliser commande" as UC_C6
    usecase "C7. Effectuer paiement" as UC_C7
    usecase "C8. Confirmer commande" as UC_C8
    usecase "C9. Suivre livraison" as UC_C9
    usecase "C10. Confirmer réception" as UC_C10
  }

  ' === SECTION D: GESTION PRODUITS ===
  package "D. Gestion Produits" {
    usecase "D1. Créer produit" as UC_D1
    usecase "D2. Modifier produit" as UC_D2
    usecase "D3. Supprimer produit" as UC_D3
    usecase "D4. Gérer variantes" as UC_D4
    usecase "D5. Gérer prix/promos" as UC_D5
    usecase "D6. Télécharger images" as UC_D6
    usecase "D7. Gérer SEO produit" as UC_D7
    usecase "D8. Modérer avis" as UC_D8
    usecase "D9. Analyser performance" as UC_D9
    usecase "D10. Import/Export masse" as UC_D10
  }

  ' === SECTION E: GESTION STOCKS ===
  package "E. Gestion Stocks" {
    usecase "E1. Consulter stocks" as UC_E1
    usecase "E2. Ajuster stocks manuellement" as UC_E2
    usecase "E3. Définir seuils d'alerte" as UC_E3
    usecase "E4. Recevoir alertes stock" as UC_E4
    usecase "E5. Gérer réservations" as UC_E5
    usecase "E6. Historique mouvements" as UC_E6
    usecase "E7. Gérer fournisseurs" as UC_E7
    usecase "E8. Passer commandes fournisseur" as UC_E8
    usecase "E9. Recevoir livraisons" as UC_E9
    usecase "E10. Inventaire physique" as UC_E10
  }

  ' === SECTION F: GESTION COMMANDES ===
  package "F. Gestion Commandes" {
    usecase "F1. Consulter commandes" as UC_F1
    usecase "F2. Valider commande" as UC_F2
    usecase "F3. Préparer commande" as UC_F3
    usecase "F4. Expédier commande" as UC_F4
    usecase "F5. Gérer retours/SAV" as UC_F5
    usecase "F6. Rembourser client" as UC_F6
    usecase "F7. Annuler commande" as UC_F7
    usecase "F8. Contacter client" as UC_F8
    usecase "F9. Générer factures" as UC_F9
    usecase "F10. Archiver commandes" as UC_F10
  }

  ' === SECTION H: REPORTING & ANALYTICS ===
  package "H. Reporting & Analytics" {
    usecase "H1. Tableau de bord" as UC_H1
    usecase "H2. Rapports ventes" as UC_H2
    usecase "H3. Analytics clients" as UC_H3
    usecase "H4. Performance produits" as UC_H4
    usecase "H5. Suivi KPI" as UC_H5
    usecase "H6. Rapports financiers" as UC_H6
    usecase "H7. Export données" as UC_H7
    usecase "H8. Rapports automatiques" as UC_H8
    usecase "H9. Alertes business" as UC_H9
    usecase "H10. Analyse prédictive" as UC_H10
  }

  ' === SECTION I: GESTION CONTENU ===
  package "I. Gestion Contenu" {
    usecase "I1. Créer article blog" as UC_I1
    usecase "I2. Publier contenu" as UC_I2
    usecase "I3. Programmer publication" as UC_I3
    usecase "I4. Modérer commentaires" as UC_I4
    usecase "I5. Gérer pages statiques" as UC_I5
    usecase "I6. SEO général" as UC_I6
    usecase "I7. Gérer médias" as UC_I7
    usecase "I8. Newsletter" as UC_I8
    usecase "I9. Campagnes marketing" as UC_I9
    usecase "I10. Réseaux sociaux" as UC_I10
  }

  ' === SECTION J: ADMINISTRATION ===
  package "J. Administration" {
    usecase "J1. Gérer utilisateurs" as UC_J1
    usecase "J2. Gérer rôles/permissions" as UC_J2
    usecase "J3. Configurer système" as UC_J3
    usecase "J4. Gérer catégories" as UC_J4
    usecase "J5. Modérer contenu" as UC_J5
    usecase "J6. Gérer boutiques" as UC_J6
    usecase "J7. Support client" as UC_J7
    usecase "J8. Gérer paiements" as UC_J8
    usecase "J9. Audit système" as UC_J9
    usecase "J10. Notifications masse" as UC_J10
  }

  ' === SECTION K: MAINTENANCE ===
  package "K. Maintenance" {
    usecase "K1. Sauvegarder données" as UC_K1
    usecase "K2. Surveiller système" as UC_K2
    usecase "K3. Optimiser performance" as UC_K3
    usecase "K4. Gérer logs" as UC_K4
    usecase "K5. Mise à jour sécurité" as UC_K5
    usecase "K6. Gérer infrastructure" as UC_K6
    usecase "K7. Tests automatisés" as UC_K7
    usecase "K8. Documentation technique" as UC_K8
    usecase "K9. Formation équipe" as UC_K9
    usecase "K10. Évolutions système" as UC_K10
  }
}

' === RELATIONS ACTEURS - CAS D'UTILISATION ===

' Visiteur (accès public)
Visiteur --> UC_A1
Visiteur --> UC_A2
Visiteur --> UC_A3
Visiteur --> UC_A4
Visiteur --> UC_A5
Visiteur --> UC_A6
Visiteur --> UC_A7
Visiteur --> UC_A8
Visiteur --> UC_B1
Visiteur --> UC_B2

' Client (authentifié)
Client --> UC_A1
Client --> UC_A2
Client --> UC_A3
Client --> UC_A4
Client --> UC_A5
Client --> UC_A6
Client --> UC_A7
Client --> UC_B3
Client --> UC_B4
Client --> UC_B5
Client --> UC_B6
Client --> UC_B7
Client --> UC_B8
Client --> UC_B9
Client --> UC_B10
Client --> UC_C1
Client --> UC_C2
Client --> UC_C3
Client --> UC_C4
Client --> UC_C5
Client --> UC_C6
Client --> UC_C7
Client --> UC_C8
Client --> UC_C9
Client --> UC_C10

' Éditeur (gestion contenu)
Editeur --> UC_I1
Editeur --> UC_I2
Editeur --> UC_I3
Editeur --> UC_I4
Editeur --> UC_I5
Editeur --> UC_I6
Editeur --> UC_I7
Editeur --> UC_I8
Editeur --> UC_I9
Editeur --> UC_I10

' Manager (gestion opérationnelle)
Manager --> UC_D1
Manager --> UC_D2
Manager --> UC_D3
Manager --> UC_D4
Manager --> UC_D5
Manager --> UC_D6
Manager --> UC_D7
Manager --> UC_D8
Manager --> UC_D9
Manager --> UC_D10
Manager --> UC_E1
Manager --> UC_E2
Manager --> UC_E3
Manager --> UC_E4
Manager --> UC_E5
Manager --> UC_E6
Manager --> UC_E7
Manager --> UC_E8
Manager --> UC_E9
Manager --> UC_E10
Manager --> UC_F1
Manager --> UC_F2
Manager --> UC_F3
Manager --> UC_F4
Manager --> UC_F5
Manager --> UC_F6
Manager --> UC_F7
Manager --> UC_F8
Manager --> UC_F9
Manager --> UC_F10
Manager --> UC_H1
Manager --> UC_H2
Manager --> UC_H3
Manager --> UC_H4
Manager --> UC_H5

' Administrateur
Admin --> UC_H6
Admin --> UC_H7
Admin --> UC_H8
Admin --> UC_H9
Admin --> UC_H10
Admin --> UC_J1
Admin --> UC_J2
Admin --> UC_J3
Admin --> UC_J4
Admin --> UC_J5
Admin --> UC_J6
Admin --> UC_J7
Admin --> UC_J8
Admin --> UC_J9
Admin --> UC_J10

' Super Admin
SuperAdmin --> UC_K1
SuperAdmin --> UC_K2
SuperAdmin --> UC_K3
SuperAdmin --> UC_K4
SuperAdmin --> UC_K5
SuperAdmin --> UC_K6
SuperAdmin --> UC_K7
SuperAdmin --> UC_K8
SuperAdmin --> UC_K9
SuperAdmin --> UC_K10

' === RELATIONS SYSTEMES EXTERNES ===
UC_C7 --> PaymentSystem : "Traiter paiement"
UC_B1 --> EmailSystem : "Email confirmation"
UC_B4 --> SMSSystem : "Code OTP"
UC_C4 --> EmailSystem : "Notification commande"
UC_C9 --> ShippingSystem : "Suivi livraison"
UC_F4 --> ShippingSystem : "Créer expédition"

' === EXTENSIONS & INCLUSIONS ===
UC_C6 ..> UC_C7 : <<include>>
UC_B1 ..> UC_B4 : <<include>>
UC_F2 ..> UC_E2 : <<include>>
UC_C8 ..> UC_F1 : <<include>>

@enduml
```

### 🔍 Cas d'Utilisation par Acteur Détaillé

#### 👤 **VISITEUR** (Non authentifié)
- **Objectif :** Découvrir et explorer l'offre
- **Permissions :** Consultation uniquement
- **Cas principaux :**
  - Navigation catalogue complet
  - Recherche et filtrage avancé
  - Consultation détails produits
  - Création de compte
  - Connexion au système

#### 🛒 **CLIENT** (Authentifié)
- **Objectif :** Effectuer des achats et gérer son compte
- **Permissions :** CRUD profil + Commandes
- **Cas principaux :**
  - Tous les cas Visiteur +
  - Gestion compte personnel complet
  - Processus d'achat end-to-end
  - Suivi commandes et livraisons
  - Gestion favoris et historique

#### ✍️ **ÉDITEUR** (Spécialisé contenu)
- **Objectif :** Créer et gérer le contenu éditorial
- **Permissions :** CRUD contenu uniquement
- **Cas principaux :**
  - Création articles blog
  - Publication et programmation contenu
  - Gestion SEO et médias
  - Modération commentaires
  - Campagnes marketing

#### 👔 **MANAGER** (Opérationnel)
- **Objectif :** Gérer les opérations quotidiennes
- **Permissions :** CRUD Produits/Stocks/Commandes
- **Cas principaux :**
  - Gestion complète produits
  - Gestion stocks et fournisseurs
  - Traitement commandes
  - Reporting opérationnel
  - SAV et support

#### ⚙️ **ADMINISTRATEUR** (Système)
- **Objectif :** Administration générale du système
- **Permissions :** Configuration système + Analytics
- **Cas principaux :**
  - Gestion utilisateurs et rôles
  - Configuration système globale
  - Analytics avancées
  - Modération générale
  - Audit et contrôle

#### 🔧 **SUPER ADMIN** (Technique)
- **Objectif :** Maintenance et évolution technique
- **Permissions :** Accès complet système
- **Cas principaux :**
  - Maintenance infrastructure
  - Monitoring et optimisation
  - Sauvegardes et sécurité
  - Évolutions techniques
  - Formation équipe

---

## 2. DIAGRAMMES DE CLASSES

### 🏗️ Modèle de Données Principal

```plantuml
@startuml AfrikMode_Classes_Principal
!theme aws-orange
title DIAGRAMME DE CLASSES PRINCIPAL - AFRIKMODE

' === CLASSE USER ===
class User {
  +id: UUID
  +email: String {unique}
  +password: String {hashed}
  +firstName: String
  +lastName: String
  +phone: String
  +avatar: String
  +role: UserRole
  +isActive: Boolean
  +isVerified: Boolean
  +emailVerifiedAt: DateTime
  +phoneVerifiedAt: DateTime
  +lastLoginAt: DateTime
  +preferences: JSON
  +createdAt: DateTime
  +updatedAt: DateTime
  +deletedAt: DateTime?
  --
  +authenticate(password: String): Boolean
  +generateJWT(): String
  +sendVerificationEmail(): void
  +updateProfile(data: Object): User
  +softDelete(): void
  +getFullName(): String
  +hasRole(role: String): Boolean
}

' === CLASSE STORE ===
class Store {
  +id: UUID
  +name: String
  +slug: String {unique}
  +description: Text
  +logo: String
  +banner: String
  +address: String
  +city: String
  +country: String
  +phone: String
  +email: String
  +website: String
  +isActive: Boolean
  +isVerified: Boolean
  +rating: Float
  +totalReviews: Integer
  +ownerId: UUID
  +settings: JSON
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +activate(): void
  +deactivate(): void
  +updateRating(): Float
  +getProducts(): Product[]
  +getActiveProducts(): Product[]
}

' === CLASSE CATEGORY ===
class Category {
  +id: UUID
  +name: String
  +slug: String {unique}
  +description: Text
  +image: String
  +parentId: UUID?
  +level: Integer
  +sortOrder: Integer
  +isActive: Boolean
  +seoTitle: String
  +seoDescription: String
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +getChildren(): Category[]
  +getParent(): Category?
  +getProducts(): Product[]
  +isChild(): Boolean
  +isParent(): Boolean
}

' === CLASSE PRODUCT ===
class Product {
  +id: UUID
  +name: String
  +slug: String {unique}
  +description: Text
  +shortDescription: String
  +sku: String {unique}
  +barcode: String
  +price: Decimal
  +comparePrice: Decimal?
  +costPrice: Decimal?
  +weight: Float
  +dimensions: JSON
  +images: JSON[]
  +isActive: Boolean
  +isDigital: Boolean
  +requiresShipping: Boolean
  +trackQuantity: Boolean
  +quantity: Integer
  +lowStockThreshold: Integer
  +allowBackorder: Boolean
  +storeId: UUID
  +categoryId: UUID
  +tags: String[]
  +attributes: JSON
  +seoTitle: String
  +seoDescription: String
  +rating: Float
  +totalReviews: Integer
  +totalSales: Integer
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +updateStock(quantity: Integer): void
  +reserveStock(quantity: Integer): Boolean
  +releaseStock(quantity: Integer): void
  +calculateDiscount(): Decimal
  +isInStock(): Boolean
  +isLowStock(): Boolean
  +updateRating(): Float
}

' === CLASSE ORDER ===
class Order {
  +id: UUID
  +orderNumber: String {unique}
  +status: OrderStatus
  +paymentStatus: PaymentStatus
  +fulfillmentStatus: FulfillmentStatus
  +userId: UUID
  +storeId: UUID
  +subtotal: Decimal
  +taxAmount: Decimal
  +shippingAmount: Decimal
  +discountAmount: Decimal
  +totalAmount: Decimal
  +currency: String
  +shippingAddress: JSON
  +billingAddress: JSON
  +notes: Text
  +cancelReason: String?
  +cancelledAt: DateTime?
  +processedAt: DateTime?
  +shippedAt: DateTime?
  +deliveredAt: DateTime?
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +calculateTotals(): void
  +cancel(reason: String): void
  +process(): void
  +ship(): void
  +deliver(): void
  +canBeCancelled(): Boolean
  +canBeRefunded(): Boolean
}

' === CLASSE ORDER_ITEM ===
class OrderItem {
  +id: UUID
  +orderId: UUID
  +productId: UUID
  +productName: String
  +productSku: String
  +quantity: Integer
  +price: Decimal
  +totalPrice: Decimal
  +productData: JSON
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +calculateTotal(): Decimal
}

' === CLASSE PAYMENT ===
class Payment {
  +id: UUID
  +orderId: UUID
  +paymentMethod: PaymentMethod
  +status: PaymentStatus
  +amount: Decimal
  +currency: String
  +gatewayTransactionId: String
  +gatewayResponse: JSON
  +failureReason: String?
  +processedAt: DateTime?
  +refundedAmount: Decimal?
  +refundedAt: DateTime?
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +process(): Boolean
  +refund(amount: Decimal): Boolean
  +cancel(): Boolean
  +isSuccessful(): Boolean
  +canBeRefunded(): Boolean
}

' === CLASSE REVIEW ===
class Review {
  +id: UUID
  +productId: UUID
  +userId: UUID
  +orderId: UUID?
  +rating: Integer
  +title: String
  +comment: Text
  +isVerified: Boolean
  +isApproved: Boolean
  +helpfulCount: Integer
  +images: String[]
  +createdAt: DateTime
  +updatedAt: DateTime
  --
  +approve(): void
  +reject(): void
  +markHelpful(): void
  +canBeEdited(): Boolean
}

' === ENUMS ===
enum UserRole {
  VISITOR
  CLIENT
  EDITOR
  MANAGER
  ADMIN
  SUPER_ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum PaymentMethod {
  CREDIT_CARD
  PAYPAL
  STRIPE
  BANK_TRANSFER
  MOBILE_MONEY
}

enum FulfillmentStatus {
  UNFULFILLED
  PARTIAL
  FULFILLED
}

' === RELATIONS ===
User ||--o{ Store : "owns"
User ||--o{ Order : "places"
User ||--o{ Review : "writes"

Store ||--o{ Product : "sells"
Store ||--o{ Order : "receives"

Category ||--o{ Product : "contains"
Category ||--o{ Category : "parent/child"

Product ||--o{ OrderItem : "ordered"
Product ||--o{ Review : "reviewed"

Order ||--o{ OrderItem : "contains"
Order ||--o{ Payment : "paid by"

User --> UserRole
Order --> OrderStatus
Order --> PaymentStatus  
Order --> FulfillmentStatus
Payment --> PaymentMethod
Payment --> PaymentStatus

@enduml
```

### 🔧 Classes de Service et Infrastructure

```plantuml
@startuml AfrikMode_Classes_Services
!theme aws-orange
title DIAGRAMMES DE CLASSES - SERVICES & INFRASTRUCTURE

' === SERVICES MÉTIER ===
class AuthService {
  -jwtSecret: String
  -bcrypt: Object
  --
  +login(email: String, password: String): AuthResult
  +register(userData: Object): User
  +verifyToken(token: String): User
  +generateToken(user: User): String
  +refreshToken(token: String): String
  +resetPassword(email: String): Boolean
  +verifyEmail(token: String): Boolean
  +verify2FA(code: String, userId: UUID): Boolean
}

class ProductService {
  -repository: ProductRepository
  -imageService: ImageService
  --
  +create(productData: Object): Product
  +update(id: UUID, data: Object): Product
  +delete(id: UUID): Boolean
  +findById(id: UUID): Product
  +findBySlug(slug: String): Product
  +search(criteria: SearchCriteria): Product[]
  +updateStock(id: UUID, quantity: Integer): void
  +calculatePrice(product: Product): Decimal
}

class OrderService {
  -paymentService: PaymentService
  -emailService: EmailService
  -stockService: StockService
  --
  +create(orderData: Object): Order
  +cancel(id: UUID, reason: String): Boolean
  +process(id: UUID): Boolean
  +ship(id: UUID, tracking: String): Boolean
  +deliver(id: UUID): Boolean
  +calculateShipping(address: Object): Decimal
  +applyDiscount(code: String): Discount
}

class PaymentService {
  -stripeClient: Object
  -paypalClient: Object
  --
  +processPayment(paymentData: Object): PaymentResult
  +refundPayment(paymentId: UUID, amount: Decimal): Boolean
  +getPaymentMethods(): PaymentMethod[]
  +validateCard(cardData: Object): Boolean
  +handleWebhook(payload: Object): void
}

class NotificationService {
  -emailService: EmailService
  -smsService: SMSService
  -pushService: PushService
  --
  +sendOrderConfirmation(order: Order): void
  +sendShippingNotification(order: Order): void
  +sendLowStockAlert(product: Product): void
  +sendPasswordReset(user: User): void
  +sendWelcomeEmail(user: User): void
  +sendPushNotification(userId: UUID, message: String): void
}

' === REPOSITORIES ===
abstract class BaseRepository {
  #db: Database
  #tableName: String
  --
  +findById(id: UUID): Entity?
  +findAll(filters: Object): Entity[]
  +create(data: Object): Entity
  +update(id: UUID, data: Object): Entity
  +delete(id: UUID): Boolean
  +softDelete(id: UUID): Boolean
  +count(filters: Object): Integer
  +paginate(page: Integer, limit: Integer): PaginatedResult
}

class UserRepository extends BaseRepository {
  +findByEmail(email: String): User?
  +findByPhone(phone: String): User?
  +findActive(): User[]
  +updateLastLogin(id: UUID): void
}

class ProductRepository extends BaseRepository {
  +findByCategory(categoryId: UUID): Product[]
  +findByStore(storeId: UUID): Product[]
  +search(query: String): Product[]
  +findFeatured(): Product[]
  +findBestSellers(): Product[]
  +updateStock(id: UUID, quantity: Integer): void
}

class OrderRepository extends BaseRepository {
  +findByUser(userId: UUID): Order[]
  +findByStatus(status: OrderStatus): Order[]
  +findByDateRange(start: Date, end: Date): Order[]
  +getRevenue(period: String): Decimal
  +getOrderStats(): OrderStats
}

' === MIDDLEWARE & UTILS ===
class AuthMiddleware {
  -authService: AuthService
  --
  +authenticate(req: Request, res: Response, next: Function): void
  +authorize(roles: String[]): Function
  +verifyToken(token: String): User?
}

class ValidationMiddleware {
  -validator: Validator
  --
  +validateCreateUser(): Function
  +validateCreateProduct(): Function
  +validateCreateOrder(): Function
  +sanitizeInput(data: Object): Object
}

class ErrorHandler {
  +handleError(error: Error, req: Request, res: Response): void
  +logError(error: Error): void
  +formatError(error: Error): ErrorResponse
}

class CacheService {
  -redis: RedisClient
  --
  +get(key: String): Object?
  +set(key: String, value: Object, ttl: Integer): void
  +delete(key: String): void
  +flush(): void
  +exists(key: String): Boolean
}

' === RELATIONS ===
AuthService --> UserRepository
ProductService --> ProductRepository
OrderService --> OrderRepository
OrderService --> PaymentService
OrderService --> NotificationService

NotificationService --> EmailService
NotificationService --> SMSService
NotificationService --> PushService

AuthMiddleware --> AuthService
ValidationMiddleware --> ErrorHandler

@enduml
```

---

## 3. DIAGRAMMES DE SÉQUENCE

### 🔐 Processus d'Authentification

```plantuml
@startuml AfrikMode_Sequence_Authentification
!theme aws-orange
title SÉQUENCE - PROCESSUS D'AUTHENTIFICATION

actor Client as C
participant "Frontend\nApp" as F
participant "Auth\nController" as AC
participant "Auth\nService" as AS
participant "User\nRepository" as UR
participant "Email\nService" as ES
participant "SMS\nService" as SMS
database "PostgreSQL" as DB

== INSCRIPTION ==
C -> F : Saisit données inscription
F -> AC : POST /auth/register
AC -> AS : register(userData)
AS -> UR : findByEmail(email)
UR -> DB : SELECT * FROM users WHERE email = ?
DB --> UR : null (email libre)
AS -> AS : hashPassword(password)
AS -> UR : create(hashedUserData)
UR -> DB : INSERT INTO users
DB --> UR : user created
AS -> ES : sendVerificationEmail(user)
ES -> ES : generateVerificationToken()
ES --> AS : email sent
AS --> AC : { user, needsVerification: true }
AC --> F : 201 { user, message: "Vérifiez votre email" }
F --> C : Affiche message vérification

== VÉRIFICATION EMAIL ==
C -> F : Clique lien email
F -> AC : GET /auth/verify-email?token=xxx
AC -> AS : verifyEmail(token)
AS -> AS : validateToken(token)
AS -> UR : markEmailAsVerified(userId)
UR -> DB : UPDATE users SET email_verified_at = NOW()
DB --> UR : updated
AS --> AC : { verified: true }
AC --> F : 200 { message: "Email vérifié" }
F --> C : Redirection vers login

== CONNEXION ==
C -> F : Saisit email/password
F -> AC : POST /auth/login
AC -> AS : login(email, password)
AS -> UR : findByEmail(email)
UR -> DB : SELECT * FROM users WHERE email = ?
DB --> UR : user data
AS -> AS : comparePassword(password, hashedPassword)
alt Password correct
    AS -> AS : generateJWT(user)
    AS -> UR : updateLastLogin(userId)
    UR -> DB : UPDATE users SET last_login_at = NOW()
    AS --> AC : { token, user, expiresIn: "24h" }
    AC --> F : 200 { token, user }
    F -> F : storeToken(localStorage)
    F --> C : Redirection dashboard
else Password incorrect
    AS --> AC : { error: "Identifiants invalides" }
    AC --> F : 401 Unauthorized
    F --> C : Affiche erreur
end

== 2FA (SI ACTIVÉ) ==
opt 2FA enabled
    AS -> SMS : sendOTP(user.phone)
    SMS -> SMS : generateOTP(6digits)
    SMS --> AS : OTP sent
    AS --> AC : { requires2FA: true, tempToken }
    AC --> F : 200 { requires2FA: true }
    F --> C : Affiche saisie code OTP
    
    C -> F : Saisit code OTP
    F -> AC : POST /auth/verify-2fa
    AC -> AS : verify2FA(tempToken, otpCode)
    AS -> AS : validateOTP(code)
    alt OTP valid
        AS -> AS : generateFinalJWT(user)
        AS --> AC : { token, user }
        AC --> F : 200 { token, user }
        F --> C : Redirection dashboard
    else OTP invalid
        AS --> AC : { error: "Code OTP invalide" }
        AC --> F : 401 Unauthorized  
        F --> C : Affiche erreur + retry
    end
end

== RÉINITIALISATION MOT DE PASSE ==
C -> F : "Mot de passe oublié"
F -> AC : POST /auth/forgot-password
AC -> AS : forgotPassword(email)
AS -> UR : findByEmail(email)
UR -> DB : SELECT * FROM users WHERE email = ?
DB --> UR : user data
AS -> AS : generateResetToken()
AS -> UR : saveResetToken(userId, token)
UR -> DB : UPDATE users SET reset_token = ?, reset_expires = ?
AS -> ES : sendPasswordResetEmail(user, token)
ES --> AS : email sent
AS --> AC : { message: "Email de réinitialisation envoyé" }
AC --> F : 200 { message }
F --> C : Affiche confirmation

C -> F : Clique lien reset email
F -> AC : GET /auth/reset-password?token=xxx
AC -> AS : validateResetToken(token)
AS -> UR : findByResetToken(token)
UR -> DB : SELECT * FROM users WHERE reset_token = ? AND reset_expires > NOW()
alt Token valid
    DB --> UR : user data
    AS --> AC : { valid: true, userId }
    AC --> F : 200 { valid: true }
    F --> C : Affiche formulaire nouveau password
    
    C -> F : Saisit nouveau password
    F -> AC : POST /auth/reset-password
    AC -> AS : resetPassword(token, newPassword)
    AS -> AS : hashPassword(newPassword)
    AS -> UR : updatePassword(userId, hashedPassword)
    UR -> DB : UPDATE users SET password = ?, reset_token = NULL
    AS --> AC : { message: "Mot de passe réinitialisé" }
    AC --> F : 200 { message }
    F --> C : Redirection login
else Token invalid/expired
    DB --> UR : null
    AS --> AC : { error: "Token invalide ou expiré" }
    AC --> F : 400 Bad Request
    F --> C : Affiche erreur
end

@enduml
```

### 🛒 Processus de Commande Complète

```plantuml
@startuml AfrikMode_Sequence_Commande
!theme aws-orange
title SÉQUENCE - PROCESSUS DE COMMANDE COMPLÈTE

actor Client as C
participant "Frontend\nApp" as F
participant "Cart\nController" as CC
participant "Order\nController" as OC
participant "Product\nService" as PS
participant "Order\nService" as OS
participant "Payment\nService" as PayS
participant "Stock\nService" as SS
participant "Email\nService" as ES
participant "Push\nService" as Push
participant "Stripe\nAPI" as Stripe
database "PostgreSQL" as DB
database "Redis\nCache" as Redis

== AJOUT AU PANIER ==
C -> F : Clique "Ajouter au panier"
F -> CC : POST /cart/add
CC -> PS : getProduct(productId)
PS -> DB : SELECT * FROM products WHERE id = ?
DB --> PS : product data
PS -> SS : checkStock(productId, quantity)
SS -> DB : SELECT quantity FROM products WHERE id = ?
DB --> SS : stock available
alt Stock suffisant
    SS --> PS : { available: true }
    PS --> CC : product data
    CC -> Redis : HSET cart:userId productId quantity
    Redis --> CC : OK
    CC --> F : 200 { message: "Produit ajouté", cartCount: 3 }
    F --> C : Notification "Ajouté au panier"
else Stock insuffisant
    SS --> PS : { available: false, stock: 2 }
    PS --> CC : { error: "Stock insuffisant" }
    CC --> F : 400 { error, availableStock: 2 }
    F --> C : Alerte stock limité
end

== CONSULTATION PANIER ==
C -> F : Va sur page panier
F -> CC : GET /cart
CC -> Redis : HGETALL cart:userId
Redis --> CC : { productId1: qty1, productId2: qty2 }
CC -> PS : getProductsByIds([productId1, productId2])
PS -> DB : SELECT * FROM products WHERE id IN (...)
DB --> PS : products data
PS --> CC : enriched cart data
CC -> CC : calculateTotals(cartData)
CC --> F : 200 { items, subtotal, shipping, total }
F --> C : Affiche panier détaillé

== PROCESSUS CHECKOUT ==
C -> F : Clique "Finaliser commande"
F -> OC : POST /orders/checkout
OC -> Redis : HGETALL cart:userId
Redis --> OC : cart items
OC -> OS : validateCart(cartItems)
OS -> PS : validateProducts(productIds)
PS -> DB : SELECT * FROM products WHERE id IN (...)
DB --> PS : products data
OS -> SS : reserveStock(cartItems)

loop Pour chaque item
    SS -> DB : UPDATE products SET quantity = quantity - ? WHERE id = ?
    alt Stock disponible
        DB --> SS : rows affected: 1
    else Stock épuisé
        DB --> SS : rows affected: 0
        SS --> OS : { error: "Produit X épuisé" }
        OS --> OC : 400 { error: "Stock insuffisant" }
        OC --> F : 400 error
        F --> C : Alerte produit épuisé
        return
    end
end

SS --> OS : Stock réservé
OS -> OS : calculateShipping(address)
OS -> OS : applyDiscounts(promoCode)
OS -> DB : INSERT INTO orders (...) RETURNING id
DB --> OS : order created
OS -> DB : INSERT INTO order_items (...)
DB --> OS : items created
OS --> OC : order data
OC --> F : 200 { orderId, paymentRequired: true }
F --> C : Redirection vers paiement

== PROCESSUS PAIEMENT ==
C -> F : Saisit infos carte bancaire
F -> PayS : POST /payments/process
PayS -> Stripe : createPaymentIntent({
Stripe --> PayS : { clientSecret, paymentIntentId }
PayS --> F : 200 { clientSecret }
F -> F : Stripe.confirmCardPayment(clientSecret)
F -> Stripe : Confirme paiement côté client
Stripe -> F : Payment succeeded
F -> PayS : POST /payments/confirm
PayS -> Stripe : retrievePaymentIntent(paymentIntentId)
Stripe --> PayS : { status: 'succeeded' }

alt Paiement réussi
    PayS -> DB : UPDATE payments SET status = 'paid'
    PayS -> DB : UPDATE orders SET payment_status = 'paid'
    PayS -> OS : confirmOrder(orderId)
    OS -> SS : confirmStockReduction(orderItems)
    SS -> DB : Stock définitivement réduit (déjà fait)
    OS -> ES : sendOrderConfirmation(order)
    ES --> OS : Email envoyé
    OS -> Push : sendOrderNotification(userId)
    Push --> OS : Push envoyé
    PayS --> F : 200 { success: true }
    F --> C : Page "Commande confirmée"
    
else Paiement échoué
    PayS -> DB : UPDATE payments SET status = 'failed'
    PayS -> SS : releaseStock(orderItems)
    SS -> DB : UPDATE products SET quantity = quantity + ?
    PayS --> F : 400 { error: "Paiement échoué" }
    F --> C : Page erreur paiement
end

== NETTOYAGE PANIER ==
opt Paiement réussi
    F -> CC : DELETE /cart/clear
    CC -> Redis : DEL cart:userId
    CC --> F : 200 OK
end

== SUIVI COMMANDE ==
C -> F : Va sur "Mes commandes"
F -> OC : GET /orders/my-orders
OC -> DB : SELECT * FROM orders WHERE user_id = ?
DB --> OC : user orders
OC --> F : 200 orders list
F --> C : Affiche historique

C -> F : Clique sur commande spécifique
F -> OC : GET /orders/:id
OC -> DB : SELECT o.*, oi.* FROM orders o JOIN order_items oi
DB --> OC : order details
OC --> F : 200 order details
F --> C : Détail commande + tracking

@enduml
```

### 💳 Processus de Paiement Sécurisé

```plantuml
@startuml AfrikMode_Sequence_Paiement
!theme aws-orange
title SÉQUENCE - PROCESSUS DE PAIEMENT SÉCURISÉ

actor Client as C
participant "Frontend\nApp" as F
participant "Payment\nController" as PC
participant "Payment\nService" as PS
participant "Order\nService" as OS
participant "Fraud\nDetection" as FD
participant "Stripe\nAPI" as Stripe
participant "PayPal\nAPI" as PayPal
participant "Webhook\nHandler" as WH
participant "Notification\nService" as NS
database "PostgreSQL" as DB

== INITIALISATION PAIEMENT ==
C -> F : Choix méthode paiement
F -> PC : POST /payments/initialize
PC -> PS : initializePayment(orderId, method)
PS -> DB : SELECT * FROM orders WHERE id = ?
DB --> PS : order data
PS -> FD : analyzeOrder(order)
FD -> FD : checkFraudRisk(amount, userHistory)
alt Risque faible
    FD --> PS : { riskScore: 0.2, status: 'approved' }
else Risque élevé
    FD --> PS : { riskScore: 0.8, status: 'review' }
    PS -> NS : alertFraudTeam(order)
    PS --> PC : 402 { error: "Commande en révision" }
    PC --> F : 402 Payment Required Review
    F --> C : "Commande en cours de vérification"
    return
end

alt Méthode: Carte bancaire (Stripe)
    PS -> Stripe : createPaymentIntent({
    Stripe --> PS : { clientSecret, paymentIntentId }
    PS -> DB : INSERT INTO payments (...)
    PS --> PC : { clientSecret, paymentId }
    PC --> F : 200 { clientSecret, provider: 'stripe' }
    
else Méthode: PayPal
    PS -> PayPal : createOrder({
    PayPal --> PS : { orderID, approvalUrl }
    PS -> DB : INSERT INTO payments (...)
    PS --> PC : { orderID, approvalUrl, provider: 'paypal' }
    PC --> F : 200 { orderID, approvalUrl }
end

== TRAITEMENT CÔTÉ CLIENT ==
alt Stripe Payment
    F -> F : loadStripeJS()
    F -> Stripe : confirmCardPayment(clientSecret, cardData)
    C -> F : Saisit infos carte
    F -> Stripe : Soumission sécurisée
    Stripe -> Stripe : Validation 3D Secure si requis
    Stripe --> F : { status: 'succeeded', paymentIntent }
    
else PayPal Payment
    F -> F : redirectToPayPal(approvalUrl)
    C -> PayPal : Connexion PayPal
    PayPal -> PayPal : Autorisation paiement
    PayPal --> F : Redirection avec token
end

== CONFIRMATION PAIEMENT ==
F -> PC : POST /payments/confirm
PC -> PS : confirmPayment(paymentId)

alt Stripe Confirmation
    PS -> Stripe : retrievePaymentIntent(paymentIntentId)
    Stripe --> PS : { status: 'succeeded', charges: [...] }
    PS -> DB : UPDATE payments SET status = 'completed'
    
else PayPal Confirmation  
    PS -> PayPal : captureOrder(orderID)
    PayPal --> PS : { status: 'COMPLETED', purchase_units: [...] }
    PS -> DB : UPDATE payments SET status = 'completed'
end

PS -> OS : markOrderAsPaid(orderId)
OS -> DB : UPDATE orders SET payment_status = 'paid'
OS -> NS : sendPaymentConfirmation(order)
NS --> OS : Notifications envoyées
PS --> PC : { success: true, transactionId }
PC --> F : 200 { success: true }
F --> C : "Paiement confirmé ✅"

== GESTION WEBHOOKS ==
Stripe -> WH : POST /webhooks/stripe
WH -> WH : validateSignature(signature, payload)
alt Signature valide
    WH -> PS : handleStripeWebhook(eventType, data)
    alt Event: payment_intent.succeeded
        PS -> DB : UPDATE payments SET gateway_status = 'succeeded'
        PS -> OS : processSuccessfulPayment(paymentId)
    else Event: payment_intent.payment_failed
        PS -> DB : UPDATE payments SET status = 'failed'
        PS -> OS : handleFailedPayment(orderId)
        PS -> NS : notifyPaymentFailure(order)
    end
    PS --> WH : processed
    WH --> Stripe : 200 OK
else Signature invalide
    WH --> Stripe : 400 Bad Request
end

PayPal -> WH : POST /webhooks/paypal
WH -> PayPal : Validate webhook signature
alt Validation OK
    WH -> PS : handlePayPalWebhook(eventType, data)
    PS -> DB : Update payment status based on event
    PS --> WH : processed
    WH --> PayPal : 200 OK
else Validation failed
    WH --> PayPal : 400 Bad Request
end

== GESTION REMBOURSEMENTS ==
opt Client demande remboursement
    C -> F : "Demander remboursement"
    F -> PC : POST /payments/refund-request
    PC -> PS : requestRefund(orderId, reason)
    PS -> DB : INSERT INTO refund_requests (...)
    PS -> NS : notifyRefundTeam(refundRequest)
    PS --> PC : { refundRequestId }
    PC --> F : 200 { message: "Demande enregistrée" }
    F --> C : "Demande de remboursement soumise"
end

opt Admin approuve remboursement
    PS -> Stripe : createRefund(paymentIntentId, amount)
    Stripe --> PS : { refund: { status: 'succeeded' } }
    PS -> DB : UPDATE payments SET refunded_amount = ?
    PS -> OS : updateOrderStatus(orderId, 'refunded')
    PS -> NS : sendRefundConfirmation(order)
end

== SÉCURITÉ & MONITORING ==
PS -> PS : logTransaction(paymentData, 'info')
PS -> FD : updateUserPaymentHistory(userId, transaction)
FD -> FD : recalculateRiskScore(userId)

opt Tentative de fraude détectée
    FD -> NS : alertSecurityTeam(suspiciousActivity)
    FD -> PS : blockUser(userId, reason: 'fraud_detection')
    PS -> DB : UPDATE users SET is_blocked = true
end

@enduml
```

### 📊 Processus Analytics et Reporting

```plantuml
@startuml AfrikMode_Sequence_Analytics
!theme aws-orange
title SÉQUENCE - PROCESSUS ANALYTICS & REPORTING

actor Manager as M
actor "Système\nScheduler" as S
participant "Analytics\nController" as AC
participant "Analytics\nService" as AS
participant "Report\nService" as RS
participant "Email\nService" as ES
participant "Data\nAggregator" as DA
database "PostgreSQL" as DB
database "Redis\nCache" as Redis
participant "PDF\nGenerator" as PDF

== CONSULTATION TABLEAU DE BORD ==
M -> AC : GET /analytics/dashboard
AC -> AS : getDashboardData(dateRange)
AS -> Redis : GET dashboard:today
Redis --> AS : cached data (if exists)
alt Cache hit
    AS --> AC : cached dashboard data
else Cache miss
    AS -> DA : aggregateRealtimeData()
    DA -> DB : SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE
    DB --> DA : todayOrders: 42
    DA -> DB : SELECT SUM(total_amount) FROM orders WHERE DATE(created_at) = CURRENT_DATE
    DB --> DA : todayRevenue: 15420.50
    DA -> DB : SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE
    DB --> DA : newUsers: 12
    DA -> DB : SELECT product_id, SUM(quantity) as sold FROM order_items oi JOIN orders o WHERE DATE(o.created_at) = CURRENT_DATE GROUP BY product_id ORDER BY sold DESC LIMIT 5
    DB --> DA : topProducts: [...]
    DA -> AS : aggregated data
    AS -> Redis : SETEX dashboard:today 300 (5min cache)
    AS --> AC : real-time dashboard data
end
AC --> M : 200 { stats, charts, kpis }

== GÉNÉRATION RAPPORT AUTOMATIQUE ==
S -> S : Cron job trigger (daily 6AM)
S -> RS : generateDailyReport()
RS -> AS : getYesterdayAnalytics()
AS -> DA : aggregateDailyData(yesterday)
DA -> DB : Complex analytics queries
loop Multiple metrics
    DB --> DA : revenue, orders, users, products, etc.
end
DA --> AS : complete analytics dataset
AS --> RS : structured data

RS -> PDF : generatePDFReport(data, template: 'daily')
PDF -> PDF : renderCharts(data.charts)
PDF -> PDF : generateTables(data.metrics)
PDF --> RS : PDF file path

RS -> ES : sendDailyReport(managers, pdfPath)
ES -> ES : loadEmailTemplate('daily_report')
ES -> ES : attachPDF(pdfPath)
loop For each manager
    ES -> ES : sendEmail(manager.email, report)
end
ES --> RS : reports sent
RS --> S : daily report completed

== ANALYSE PERSONNALISÉE ==
M -> AC : POST /analytics/custom-report
AC -> AS : generateCustomReport(criteria)
AS -> AS : validateCriteria(criteria)
AS -> DA : buildQuery(criteria)
DA -> DB : Custom SQL query execution
DB --> DA : raw query results
DA -> DA : processAndAggregateData(results)
DA --> AS : processed analytics data
AS -> AS : formatForPresentation(data)
AS --> AC : custom report data
AC --> M : 200 { report, exportOptions }

== EXPORT DONNÉES ==
M -> AC : GET /analytics/export?format=excel
AC -> AS : exportData(format, filters)
AS -> DA : getExportData(filters)
DA -> DB : SELECT detailed data for export
DB --> DA : comprehensive dataset
DA --> AS : export-ready data
AS -> AS : generateExcelFile(data)
AS --> AC : { downloadUrl, fileName }
AC --> M : 200 { downloadUrl }

== ALERTES AUTOMATIQUES ==
opt Revenue threshold breach
    DA -> DA : checkRevenueThreshold()
    DA -> AS : dailyRevenue < expectedRevenue * 0.8
    AS -> ES : sendLowRevenueAlert(managementTeam)
    ES --> AS : alert sent
end

opt Stock alerts
    DA -> DB : SELECT * FROM products WHERE quantity <= low_stock_threshold
    DB --> DA : low stock products
    DA -> AS : processLowStockAlert(products)
    AS -> ES : sendStockAlert(purchasingTeam, products)
    ES --> AS : stock alerts sent
end

opt Fraud detection
    AS -> DA : analyzeSuspiciousActivity()
    DA -> DB : Complex fraud detection queries
    DB --> DA : suspicious transactions
    DA -> AS : flaggedTransactions
    AS -> ES : sendSecurityAlert(securityTeam)
    ES --> AS : security alerts sent
end

== MÉTRIQUES EN TEMPS RÉEL ==
M -> AC : WebSocket connection /ws/analytics
AC -> AS : subscribeToRealtimeMetrics(managerId)
AS -> Redis : SUBSCRIBE analytics:realtime
loop Real-time events
    Redis -> AS : New order placed
    AS -> AS : updateRealtimeMetrics()
    AS -> AC : broadcastUpdate(newMetrics)
    AC -> M : WebSocket message { type: 'metrics_update', data }
end

== ANALYSE PRÉDICTIVE ==
S -> S : Weekly prediction job
S -> AS : generatePredictiveAnalytics()
AS -> DA : getHistoricalData(lastYear)
DA -> DB : Historical sales, seasonal patterns
DB --> DA : time series data
DA -> DA : applyMachineLearningModels(data)
DA -> DA : predictNextMonth(trends)
DA --> AS : predictions { revenue, bestsellers, trends }
AS -> RS : createPredictiveReport(predictions)
RS -> PDF : generatePredictionReport()
RS -> ES : sendPredictiveReport(executives)

@enduml
```

---

## 4. DIAGRAMMES D'ACTIVITÉ

### 🛒 Workflow Processus d'Achat

```plantuml
@startuml AfrikMode_Activity_ProcessusAchat
!theme aws-orange
title DIAGRAMME D'ACTIVITÉ - PROCESSUS D'ACHAT COMPLET

|Client|
start
:Parcourir catalogue;
:Sélectionner produit;
:Consulter détails;

if (Produit satisfaisant?) then (oui)
  :Ajouter au panier;
else (non)
  :Continuer navigation;
  stop
endif

|Système|
:Vérifier stock disponible;
if (Stock suffisant?) then (oui)
  :Confirmer ajout panier;
  |Client|
  :Voir panier mis à jour;
else (non)
  :Afficher stock restant;
  |Client|
  :Ajuster quantité ou changer produit;
  |Système|
  :Vérifier nouveau stock;
endif

|Client|
if (Continuer shopping?) then (oui)
  :Ajouter autres produits;
  |Système|
  repeat
    :Vérifier stock;
    :Mettre à jour panier;
  repeat while (Autres produits?) is (oui)
else (non)
endif

:Aller au checkout;
:Vérifier articles panier;
:Saisir adresse livraison;

|Système|
:Calculer frais de port;
:Appliquer promotions/coupons;
:Calculer total final;

|Client|
:Choisir mode livraison;
:Confirmer commande;

|Système|
:Créer commande en base;
:Réserver stock;
if (Réservation réussie?) then (oui)
  :Rediriger vers paiement;
else (non)
  :Libérer réservations;
  :Notifier produits indisponibles;
  |Client|
  :Ajuster commande;
  |Système|
  :Recalculer total;
endif

|Client|
:Choisir méthode paiement;
:Saisir informations paiement;

|Système|
:Vérifier données paiement;
:Détecter fraude potentielle;
if (Paiement sécurisé?) then (oui)
  :Traiter paiement;
  if (Paiement accepté?) then (oui)
    :Confirmer stock définitivement;
    :Marquer commande payée;
    :Vider panier;
    :Envoyer confirmation email;
    :Envoyer notification push;
    |Client|
    :Recevoir confirmation;
    :Accéder suivi commande;
  else (non)
    :Libérer stock réservé;
    :Marquer paiement échoué;
    |Client|
    :Recevoir erreur paiement;
    :Retry ou changer méthode;
  endif
else (non)
  :Bloquer transaction;
  :Alerter équipe sécurité;
  |Client|
  :Recevoir message sécurité;
  :Contacter support;
endif

|Système|
fork
  :Traitement logistique;
  :Préparation commande;
  :Expédition;
  :Suivi transport;
fork again
  :Mise à jour analytics;
  :Calcul commission;
  :Rapport ventes;
end fork

|Client|
:Suivre livraison;
:Recevoir produits;
:Confirmer réception;
if (Satisfait commande?) then (oui)
  :Laisser avis produit;
else (non)
  :Demander retour/remboursement;
  |Système|
  :Traiter demande SAV;
endif

stop

@enduml
```

### 📦 Workflow Gestion des Stocks

```plantuml
@startuml AfrikMode_Activity_GestionStocks
!theme aws-orange
title DIAGRAMME D'ACTIVITÉ - GESTION DES STOCKS

|Manager|
start
:Consulter tableau de bord stocks;

|Système|
:Calculer stocks actuels;
:Identifier alertes;
:Générer rapports stocks;

|Manager|
if (Stocks critiques détectés?) then (oui)
  fork
    :Analyser historique ventes;
    :Prévoir demande future;
  fork again
    :Contacter fournisseurs;
    :Négocier prix/délais;
  fork again
    :Vérifier budgets achats;
    :Valider crédits fournisseur;
  end fork
  
  :Créer bon de commande;
  |Système|
  :Calculer quantités optimales;
  :Appliquer règles métier;
  
  |Manager|
  :Valider commande fournisseur;
  |Système|
  :Envoyer commande (EDI/Email);
  :Créer suivi commande;
  :Programmer rappels;
else (non)
endif

|Système|
repeat
  :Surveiller niveaux stocks;
  :Détecter seuils d'alerte;
  if (Seuil atteint?) then (oui)
    :Générer alerte automatique;
    :Notifier responsable stocks;
    |Manager|
    :Recevoir notification;
    if (Action immédiate requise?) then (oui)
      :Ajustement stock manuel;
      |Système|
      :Enregistrer mouvement;
      :Tracer modification;
    else (non)
      :Planifier réapprovisionnement;
    endif
  else (non)
  endif
repeat while (Surveillance continue?) is (oui)

|Fournisseur|
:Préparer livraison;
:Expédier marchandises;
:Envoyer bon de livraison;

|Système|
:Recevoir notification expédition;
:Mettre à jour statut commande;
:Programmer réception;

|Réceptionnaire|
:Recevoir marchandises;
:Contrôler qualité;
:Vérifier quantités;
:Contrôler conformité;

if (Livraison conforme?) then (oui)
  :Accepter livraison;
  |Système|
  :Mettre à jour stocks;
  :Générer mouvement entrée;
  :Valider facture fournisseur;
  :Déclencher comptabilisation;
else (non)
  if (Erreur quantité?) then (oui)
    :Signaler écart;
    :Créer litige fournisseur;
    |Système|
    :Ajuster stock avec écart;
    :Générer rapport anomalie;
  else (qualité défaillante?)
    :Refuser lot défectueux;
    :Créer retour fournisseur;
    |Système|
    :Ne pas impacter stock;
    :Créer avoir à recevoir;
  endif
endif

|Système|
fork
  :Recalculer stocks disponibles;
  :Mettre à jour catalogue;
  :Réactiver produits épuisés;
fork again
  :Débloquer commandes en attente;
  :Traiter précommandes;
  :Notifier clients liste d'attente;
fork again
  :Calculer coûts moyens;
  :Mettre à jour prix de revient;
  :Analyser marges;
end fork

|Manager|
:Analyser performance stocks;
:Identifier produits morts;
if (Actions correctives?) then (oui)
  fork
    :Promotions destockage;
  fork again
    :Retour fournisseur;
  fork again
    :Liquidation;
  end fork
else (non)
endif

== INVENTAIRE PHYSIQUE ==
|Manager|
:Planifier inventaire;
:Bloquer mouvements;
:Créer équipes comptage;

|Équipe Inventaire|
fork
  :Zone A - Comptage physique;
fork again  
  :Zone B - Comptage physique;
fork again
  :Zone C - Comptage physique;
end fork

:Saisir quantités comptées;
|Système|
:Calculer écarts inventaire;
:Générer rapport écarts;

|Manager|
if (Écarts significatifs?) then (oui)
  :Organiser recomptage;
  :Analyser causes écarts;
  :Ajuster procédures;
else (non)
endif

:Valider inventaire;
|Système|
:Ajuster stocks théoriques;
:Générer écritures comptables;
:Reprendre mouvements normaux;

stop

@enduml
```

### ⚙️ Workflow Administration Système

```plantuml
@startuml AfrikMode_Activity_Administration
!theme aws-orange
title DIAGRAMME D'ACTIVITÉ - ADMINISTRATION SYSTÈME

|Admin|
start
:Se connecter dashboard admin;

|Système|
:Vérifier permissions;
:Charger métriques système;
:Afficher alertes critiques;

|Admin|
if (Alertes critiques?) then (oui)
  fork
    if (Performance dégradée?) then (oui)
      :Analyser métriques performance;
      :Identifier goulots d'étranglement;
      |Système|
      :Optimiser requêtes lentes;
      :Ajuster paramètres cache;
      :Redimensionner ressources;
    else (non)
    endif
  fork again
    if (Erreurs système?) then (oui)
      :Consulter logs détaillés;
      :Identifier cause racine;
      |Système|
      :Appliquer correctifs;
      :Redémarrer services si nécessaire;
      :Tester fonctionnalités;
    else (non)
    endif
  fork again
    if (Sécurité compromise?) then (oui)
      :Activer mode maintenance;
      :Isoler système compromis;
      :Analyser logs sécurité;
      :Appliquer patches sécurité;
      :Renforcer authentification;
      :Notifier utilisateurs;
    else (non)
    endif
  end fork
else (non)
endif

== GESTION UTILISATEURS ==
|Admin|
:Accéder gestion utilisateurs;
:Consulter liste utilisateurs;

fork
  if (Nouveaux comptes à valider?) then (oui)
    :Vérifier documents KYC;
    :Valider identité;
    if (Documents conformes?) then (oui)
      :Approuver compte;
      |Système|
      :Activer compte utilisateur;
      :Envoyer confirmation;
    else (non)
      :Rejeter avec motifs;
      |Système|
      :Notifier refus utilisateur;
    endif
  else (non)
  endif
fork again
  if (Comptes suspicieux?) then (oui)
    :Analyser activité utilisateur;
    :Vérifier transactions;
    if (Fraude confirmée?) then (oui)
      :Bloquer compte définitivement;
      :Rembourser transactions légitimes;
      |Système|
      :Blacklister utilisateur;
      :Alerter autres plateformes;
    else (non)
      :Lever suspension temporaire;
    endif
  else (non)
  endif
fork again
  :Gérer rôles et permissions;
  :Attribuer permissions spéciales;
  :Créer groupes utilisateurs;
end fork

== CONFIGURATION SYSTÈME ==
|Admin|
:Accéder paramètres système;

fork
  :Configurer passerelles paiement;
  :Mettre à jour clés API;
  :Tester connexions;
fork again
  :Configurer notifications;
  :Personnaliser templates email;
  :Configurer SMS/Push;
fork again
  :Gérer catégories produits;
  :Organiser taxonomie;
  :Configurer attributs produits;
fork again
  :Paramétrer frais de port;
  :Configurer zones livraison;
  :Mettre à jour tarifs transporteurs;
end fork

== MONITORING & ANALYTICS ==
|Admin|
:Consulter tableaux de bord;

|Système|
fork
  :Générer métriques business;
  :Calculer KPI temps réel;
  :Analyser tendances;
fork again
  :Surveiller infrastructure;
  :Monitorer ressources serveur;
  :Vérifier santé base de données;
fork again
  :Analyser logs applicatifs;
  :Détecter patterns d'erreur;
  :Identifier optimisations;
end fork

|Admin|
if (Intervention requise?) then (oui)
  fork
    :Optimiser performances;
    :Ajuster cache Redis;
    :Optimiser requêtes BDD;
  fork again
    :Planifier maintenance;
    :Notifier utilisateurs;
    :Programmer interventions;
  fork again
    :Mettre à jour système;
    :Déployer correctifs;
    :Tester fonctionnalités;
  end fork
else (non)
endif

== SAUVEGARDE & SÉCURITÉ ==
|Admin|
:Vérifier sauvegardes automatiques;

|Système|
:Exécuter backup quotidien;
:Vérifier intégrité données;
:Tester procédure restore;
if (Backup successful?) then (oui)
  :Archiver anciennes sauvegardes;
else (non)
  |Admin|
  :Déclencher backup manuel;
  :Investiguer causes échec;
  :Corriger configuration;
endif

|Admin|
fork
  :Audit logs accès;
  :Vérifier tentatives intrusion;
  :Analyser patterns suspects;
fork again
  :Mettre à jour certificats SSL;
  :Renouveler tokens API;
  :Vérifier chiffrement données;
fork again
  :Former équipe sécurité;
  :Mettre à jour procédures;
  :Tester plan disaster recovery;
end fork

== SUPPORT UTILISATEURS ==
|Admin|
:Traiter tickets support niveau 3;

fork
  if (Problème technique complexe?) then (oui)
    :Analyser logs utilisateur;
    :Reproduire problème;
    :Développer solution;
    :Tester correctif;
    :Déployer fix;
    :Confirmer résolution;
  else (non)
  endif
fork again
  if (Demande fonctionnelle?) then (oui)
    :Analyser faisabilité;
    :Estimer impact développement;
    :Planifier évolution;
    :Prioriser roadmap;
  else (non)
  endif
end fork

stop

@enduml
```
