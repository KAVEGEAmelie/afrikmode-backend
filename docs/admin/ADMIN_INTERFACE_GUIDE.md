# 🛠️ DOCUMENTATION INTERFACE ADMIN - AFRIKMODE

## 🎯 VUE D'ENSEMBLE

L'interface admin d'AfrikMode offre un contrôle complet sur la plateforme e-commerce. Cette documentation détaille toutes les fonctionnalités administratives disponibles via l'API.

### 🏛️ **Architecture Admin**
- **Rôles Admin**: `admin`, `super_admin`, `manager`
- **Authentification**: JWT avec 2FA obligatoire pour actions sensibles
- **Permissions**: Système granulaire par rôle et action
- **Audit**: Traçabilité complète des actions admin

---

## 👤 SYSTÈME DE RÔLES

### 🔑 **Hiérarchie des Rôles**

#### 🚀 **Super Admin (`super_admin`)**
- Accès total à toutes les fonctionnalités
- Gestion des autres administrateurs
- Configuration système avancée
- Accès aux données sensibles

#### ⚡ **Admin (`admin`)**
- Gestion complète des contenus
- Modération des boutiques et produits
- Support client avancé
- Rapports et statistiques

#### 📊 **Manager (`manager`)**
- Support client
- Modération de base
- Rapports limités
- Gestion tickets

### 🛡️ **Vérifications de Permissions**
```javascript
// Dans vos composants Angular
hasAdminAccess(): boolean {
  const user = this.authService.getCurrentUser();
  return ['admin', 'super_admin', 'manager'].includes(user?.role);
}

isSuperAdmin(): boolean {
  const user = this.authService.getCurrentUser();
  return user?.role === 'super_admin';
}
```

---

## 📊 TABLEAU DE BORD PRINCIPAL

### 🎯 **Dashboard Global**
**Endpoint**: `GET /api/analytics/dashboard`

```typescript
interface DashboardData {
  userStats: {
    total_users: number;
    new_users_30d: number;
    total_vendors: number;
    total_customers: number;
    active_users: number;
  };
  storeStats: {
    total_stores: number;
    active_stores: number;
    verified_stores: number;
    featured_stores: number;
  };
  productStats: {
    total_products: number;
    active_products: number;
    out_of_stock: number;
    pending_approval: number;
  };
  orderStats: {
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    total_revenue: number;
    average_order_value: number;
  };
  recentActivity: ActivityItem[];
}
```

#### 🔧 **Service Angular Dashboard**
```typescript
@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getDashboardData(period: '7d' | '30d' | '90d' | '1y' = '30d'): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/analytics/dashboard?period=${period}`);
  }

  getRealtimeStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/realtime`);
  }
}
```

### 📈 **Widgets Dashboard**

#### 1️⃣ **Métriques Clés**
```typescript
interface KeyMetrics {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  conversionRate: number;
  growth: {
    users: number;    // % croissance
    revenue: number;
    orders: number;
  };
}
```

#### 2️⃣ **Graphiques Temps Réel**
- 📊 Ventes par jour/semaine/mois
- 👥 Nouveaux utilisateurs
- 🛒 Taux de conversion
- 💰 Revenus par catégorie

#### 3️⃣ **Activité Récente**
- 🆕 Nouvelles commandes
- 👤 Nouveaux utilisateurs
- 🏪 Nouvelles boutiques
- ⚠️ Alertes système

---

## 👥 GESTION DES UTILISATEURS

### 📋 **Liste des Utilisateurs**
**Endpoint**: `GET /api/users?role=all&status=all&page=1&limit=50`

```typescript
interface UserListResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    roles: string[];
    statuses: string[];
  };
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'vendor' | 'admin' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  is_verified: boolean;
  two_factor_enabled: boolean;
  last_login_at: string;
  created_at: string;
  orders_count: number;
  total_spent: number;
}
```

### 🔧 **Actions Utilisateurs**

#### 👤 **Profil Détaillé**
**Endpoint**: `GET /api/users/:id`
- Informations complètes
- Historique des commandes
- Activité récente
- Notes administratives

#### ✏️ **Modifier Utilisateur**
**Endpoint**: `PUT /api/users/:id`
```typescript
interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  admin_notes?: string;
}
```

#### 🚫 **Actions de Modération**
```typescript
// Suspendre utilisateur
POST /api/users/:id/suspend
{
  reason: string;
  duration?: number; // jours
  notify_user: boolean;
}

// Bannir utilisateur
POST /api/users/:id/ban
{
  reason: string;
  permanent: boolean;
}

// Réactiver utilisateur
POST /api/users/:id/activate
{
  reason: string;
  notify_user: boolean;
}
```

---

## 🏪 GESTION DES BOUTIQUES

### 📊 **Dashboard Boutiques**
**Endpoint**: `GET /api/stores?admin=true&page=1&limit=20`

```typescript
interface StoreAdminView {
  id: string;
  name: string;
  description: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  is_verified: boolean;
  featured: boolean;
  products_count: number;
  orders_count: number;
  total_revenue: number;
  rating: number;
  created_at: string;
  last_activity: string;
}
```

### ✅ **Approbation Boutiques**
```typescript
// Approuver une boutique
PUT /api/stores/:id/approve
{
  featured?: boolean;
  welcome_message?: string;
  admin_notes?: string;
}

// Rejeter une boutique
PUT /api/stores/:id/reject
{
  reason: string;
  feedback: string;
  resubmit_allowed: boolean;
}

// Suspendre une boutique
PUT /api/stores/:id/suspend
{
  reason: string;
  duration?: number; // jours
  notify_owner: boolean;
}
```

### 🎯 **Mise en Avant**
```typescript
// Mettre en avant une boutique
POST /api/stores/:id/feature
{
  duration: number; // jours
  position?: number; // ordre d'affichage
  promotion_text?: string;
}

// Retirer mise en avant
DELETE /api/stores/:id/feature
```

---

## 📦 GESTION DES PRODUITS

### 📋 **Liste Admin Produits**
**Endpoint**: `GET /api/products?admin=true&status=all&approval=all`

```typescript
interface ProductAdminView {
  id: string;
  name: string;
  store: {
    id: string;
    name: string;
    owner_name: string;
  };
  category: {
    id: string;
    name: string;
  };
  price: number;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  approval_status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  views_count: number;
  orders_count: number;
  created_at: string;
  admin_notes?: string;
}
```

### ✅ **Modération Produits**
```typescript
// Approuver produit
PUT /api/products/:id/approve
{
  featured?: boolean;
  admin_notes?: string;
  seo_optimization?: boolean;
}

// Rejeter produit
PUT /api/products/:id/reject
{
  reason: string;
  violations: string[];
  resubmit_guidelines: string;
}

// Signaler problème
POST /api/products/:id/flag
{
  issue_type: 'copyright' | 'inappropriate' | 'fake' | 'other';
  details: string;
  severity: 'low' | 'medium' | 'high';
}
```

---

## 🛒 GESTION DES COMMANDES

### 📊 **Dashboard Commandes**
**Endpoint**: `GET /api/orders?admin=true&status=all&date_range=30d`

```typescript
interface OrderAdminView {
  id: string;
  order_number: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  admin_notes?: string;
  tracking_info?: {
    carrier: string;
    tracking_number: string;
    status: string;
  };
}
```

### 🔧 **Actions Commandes**

#### 📝 **Modifier Statut**
```typescript
PUT /api/orders/:id/status
{
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  admin_notes?: string;
  tracking_info?: {
    carrier: string;
    tracking_number: string;
  };
  notify_customer: boolean;
}
```

#### 💰 **Gestion Paiements**
```typescript
// Initier remboursement
POST /api/payments/:payment_id/refund
{
  amount?: number; // remboursement partiel si spécifié
  reason: string;
  notify_customer: boolean;
}

// Statistiques paiements
GET /api/payments/admin/stats
{
  total_processed: number;
  total_refunded: number;
  failed_payments: number;
  pending_refunds: number;
}
```

---

## 🎫 SUPPORT CLIENT

### 📋 **Dashboard Support**
**Endpoint**: `GET /api/tickets/admin?status=all&priority=all&agent=all`

```typescript
interface TicketAdminView {
  id: string;
  ticket_number: string;
  subject: string;
  customer: {
    id: string;
    name: string;
    email: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  assigned_agent?: {
    id: string;
    name: string;
  };
  messages_count: number;
  created_at: string;
  last_response_at: string;
  resolution_time?: number; // minutes
  satisfaction_rating?: number;
}
```

### 🎯 **Gestion Tickets**

#### 📨 **Attribution & Suivi**
```typescript
// Assigner ticket
PUT /api/tickets/:id/assign
{
  agent_id: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimated_resolution?: string; // ISO date
}

// Changer statut
PUT /api/tickets/:id/status
{
  status: 'in_progress' | 'resolved' | 'closed';
  resolution_notes?: string;
  follow_up_required?: boolean;
}

// Escalader ticket
POST /api/tickets/:id/escalate
{
  reason: string;
  escalation_level: 'manager' | 'supervisor' | 'executive';
  urgent: boolean;
}
```

#### 📊 **Statistiques Support**
```typescript
GET /api/tickets/admin/stats
{
  overview: {
    total_tickets: number;
    open_tickets: number;
    in_progress: number;
    resolved_today: number;
    average_resolution_time: number; // heures
    satisfaction_score: number;
  };
  by_agent: {
    agent_id: string;
    agent_name: string;
    tickets_assigned: number;
    tickets_resolved: number;
    avg_resolution_time: number;
    satisfaction_score: number;
  }[];
  by_category: {
    category: string;
    count: number;
    avg_resolution_time: number;
  }[];
}
```

---

## 🎁 GESTION PROMOTIONS

### 🎟️ **Coupons & Codes Promo**
**Endpoint**: `GET /api/coupons` (Admin seulement)

```typescript
interface CouponAdmin {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_order_amount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  applicable_to: 'all' | 'categories' | 'products' | 'users';
  restrictions: {
    categories?: string[];
    products?: string[];
    user_roles?: string[];
    first_order_only?: boolean;
  };
  created_at: string;
}
```

#### 🆕 **Créer Coupon**
```typescript
POST /api/coupons
{
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  description: string;
  minimum_order_amount?: number;
  usage_limit?: number;
  user_usage_limit?: number; // par utilisateur
  valid_from: string;
  valid_until: string;
  applicable_to: 'all' | 'categories' | 'products' | 'users';
  restrictions: {
    categories?: string[];
    products?: string[];
    user_roles?: string[];
    first_order_only?: boolean;
  };
}
```

### 📈 **Statistiques Promotions**
```typescript
GET /api/coupons/:id/stats
{
  usage: {
    total_used: number;
    unique_users: number;
    total_discount_given: number;
    orders_influenced: number;
    revenue_impact: number;
  };
  trends: {
    daily_usage: { date: string; count: number }[];
    top_users: { user_id: string; user_name: string; usage_count: number }[];
  };
}
```

---

## 🔔 NOTIFICATIONS ADMIN

### 📢 **Notifications Système**
**Endpoint**: `POST /api/notifications/admin/send`

```typescript
interface AdminNotification {
  type: 'broadcast' | 'targeted' | 'scheduled';
  title: string;
  body: string;
  recipients?: {
    user_ids?: string[];
    roles?: string[];
    segments?: string[];
  };
  channels: ('push' | 'email' | 'sms')[];
  scheduled_for?: string; // ISO date
  priority: 'low' | 'normal' | 'high' | 'urgent';
  call_to_action?: {
    text: string;
    url: string;
  };
}
```

### 📊 **Statistiques Notifications**
```typescript
GET /api/notifications/admin/stats
{
  overview: {
    total_sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
  };
  by_channel: {
    channel: 'push' | 'email' | 'sms';
    sent: number;
    delivered: number;
    engagement_rate: number;
  }[];
  recent_campaigns: {
    id: string;
    title: string;
    sent_at: string;
    recipients_count: number;
    delivery_rate: number;
    engagement_rate: number;
  }[];
}
```

---

## 📊 RAPPORTS & ANALYTICS

### 📈 **Rapports Personnalisés**
**Endpoint**: `POST /api/reports/generate`

```typescript
interface ReportRequest {
  type: 'sales' | 'users' | 'products' | 'stores' | 'custom';
  period: {
    start_date: string;
    end_date: string;
  };
  filters: {
    store_ids?: string[];
    category_ids?: string[];
    user_roles?: string[];
    payment_methods?: string[];
  };
  metrics: string[]; // ['revenue', 'orders', 'users', etc.]
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  scheduled?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    day_of_week?: number;
    day_of_month?: number;
    time: string; // HH:mm
    email_to: string[];
  };
}
```

### 📊 **Analytics Avancés**

#### 💰 **Revenus & Ventes**
```typescript
GET /api/analytics/revenue?period=30d&breakdown=daily
{
  total_revenue: number;
  period_growth: number;
  breakdown: {
    date: string;
    revenue: number;
    orders_count: number;
    avg_order_value: number;
  }[];
  by_category: {
    category: string;
    revenue: number;
    percentage: number;
  }[];
  top_products: {
    product_id: string;
    product_name: string;
    revenue: number;
    units_sold: number;
  }[];
}
```

#### 👥 **Analytics Utilisateurs**
```typescript
GET /api/analytics/users?period=30d
{
  acquisition: {
    new_users: number;
    growth_rate: number;
    by_source: {
      source: string;
      count: number;
    }[];
  };
  engagement: {
    active_users: number;
    retention_rate: number;
    avg_session_duration: number;
    bounce_rate: number;
  };
  demographics: {
    by_location: { country: string; count: number }[];
    by_age_group: { range: string; count: number }[];
    by_device: { device_type: string; count: number }[];
  };
}
```

---

## 🛡️ SÉCURITÉ & MONITORING

### 🔒 **Dashboard Sécurité**
**Endpoint**: `GET /api/security/dashboard`

```typescript
interface SecurityDashboard {
  overview: {
    total_threats_blocked: number;
    failed_login_attempts: number;
    suspicious_activities: number;
    active_sessions: number;
  };
  recent_alerts: {
    id: string;
    type: 'brute_force' | 'suspicious_ip' | 'data_breach_attempt' | 'malware';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ip_address: string;
    user_agent: string;
    timestamp: string;
    status: 'pending' | 'investigating' | 'resolved';
  }[];
  rate_limiting: {
    endpoint: string;
    current_requests: number;
    limit: number;
    blocked_requests: number;
  }[];
}
```

### 📋 **Logs Système**
```typescript
GET /api/security/logs?category=all&level=all&page=1&limit=100
{
  logs: {
    id: string;
    category: 'auth' | 'user_action' | 'system' | 'api' | 'security' | 'payment' | 'order' | 'admin';
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    user_id?: string;
    ip_address: string;
    user_agent: string;
    metadata: any;
    timestamp: string;
  }[];
  statistics: {
    total_logs: number;
    by_level: { level: string; count: number }[];
    by_category: { category: string; count: number }[];
  };
}
```

---

## 🎨 GESTION CONTENUS

### 📸 **Médias & CDN**
**Endpoint**: `GET /api/media/admin/dashboard`

```typescript
interface MediaDashboard {
  general: {
    total_files: number;
    total_size: number;
    average_size: number;
    max_size: number;
  };
  byCategory: {
    category: string;
    count: number;
    total_size: number;
  }[];
  storage: {
    used_space: number;
    available_space: number;
    usage_percentage: number;
  };
  cdn: {
    requests_count: number;
    bandwidth_used: number;
    cache_hit_rate: number;
  };
}
```

### 🧹 **Maintenance Médias**
```typescript
// Nettoyer fichiers orphelins
POST /api/media/admin/cleanup/orphaned

// Optimiser images
POST /api/media/admin/optimize
{
  format: 'webp' | 'avif' | 'auto';
  quality: number; // 1-100
  max_width?: number;
  max_height?: number;
}

// Statistiques de stockage
GET /api/media/admin/storage-stats
{
  by_type: { type: string; size: number; count: number }[];
  by_age: { period: string; size: number; count: number }[];
  duplicates_found: number;
  optimization_potential: number; // bytes
}
```

---

## ⚙️ CONFIGURATION SYSTÈME

### 🔧 **Paramètres Généraux**
**Endpoint**: `GET/PUT /api/admin/settings`

```typescript
interface SystemSettings {
  site: {
    name: string;
    description: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    secondary_color: string;
  };
  business: {
    company_name: string;
    address: string;
    phone: string;
    email: string;
    tax_number: string;
    currency: string;
    timezone: string;
  };
  features: {
    enable_registration: boolean;
    enable_guest_checkout: boolean;
    enable_reviews: boolean;
    enable_wishlist: boolean;
    enable_referral: boolean;
    maintenance_mode: boolean;
  };
  limits: {
    max_products_per_store: number;
    max_images_per_product: number;
    max_file_upload_size: number;
    order_timeout_minutes: number;
  };
  email: {
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    from_email: string;
    from_name: string;
  };
  payment: {
    enabled_methods: string[];
    test_mode: boolean;
    auto_capture: boolean;
    refund_policy_days: number;
  };
}
```

### 📧 **Templates Email**
```typescript
GET /api/admin/email-templates
{
  templates: {
    id: string;
    name: string;
    type: 'order_confirmation' | 'shipping_notification' | 'password_reset' | 'welcome';
    subject: string;
    html_content: string;
    text_content: string;
    variables: string[];
    is_active: boolean;
    last_modified: string;
  }[];
}

PUT /api/admin/email-templates/:id
{
  subject: string;
  html_content: string;
  text_content: string;
  is_active: boolean;
}
```

---

## 🎯 INTERFACES RECOMMANDÉES

### 📱 **Layout Admin Angular**

#### 🏗️ **Structure Recommandée**
```
src/app/admin/
├── shared/
│   ├── components/
│   │   ├── admin-layout/
│   │   ├── admin-sidebar/
│   │   ├── admin-header/
│   │   ├── stats-card/
│   │   ├── data-table/
│   │   └── charts/
│   ├── services/
│   │   ├── admin-auth.service.ts
│   │   ├── admin-dashboard.service.ts
│   │   └── admin-api.service.ts
│   └── guards/
│       ├── admin.guard.ts
│       └── super-admin.guard.ts
├── dashboard/
├── users/
├── stores/
├── products/
├── orders/
├── support/
├── promotions/
├── analytics/
├── notifications/
├── media/
├── security/
└── settings/
```

#### 🎨 **Composants Clés**

##### 📊 **Stats Card Component**
```typescript
@Component({
  selector: 'app-stats-card',
  template: `
    <div class="stats-card" [ngClass]="type">
      <div class="stats-icon">
        <mat-icon>{{icon}}</mat-icon>
      </div>
      <div class="stats-content">
        <div class="stats-value">{{value | number}}</div>
        <div class="stats-label">{{label}}</div>
        <div class="stats-change" [ngClass]="changeType">
          <mat-icon>{{changeIcon}}</mat-icon>
          {{change}}%
        </div>
      </div>
    </div>
  `
})
export class StatsCardComponent {
  @Input() type: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() icon!: string;
  @Input() value!: number;
  @Input() label!: string;
  @Input() change!: number;
  
  get changeType(): string {
    return this.change >= 0 ? 'positive' : 'negative';
  }
  
  get changeIcon(): string {
    return this.change >= 0 ? 'trending_up' : 'trending_down';
  }
}
```

##### 🗃️ **Data Table Component**
```typescript
@Component({
  selector: 'app-admin-data-table',
  template: `
    <div class="data-table-container">
      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field>
              <mat-label>Recherche</mat-label>
              <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            
            <mat-form-field>
              <mat-label>Statut</mat-label>
              <mat-select [(ngModel)]="selectedStatus" (selectionChange)="onFilterChange()">
                <mat-option value="">Tous</mat-option>
                <mat-option *ngFor="let status of statuses" [value]="status.value">
                  {{status.label}}
                </mat-option>
              </mat-select>
            </mat-form-field>
            
            <button mat-raised-button color="primary" (click)="onRefresh()">
              <mat-icon>refresh</mat-icon>
              Actualiser
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Table -->
      <mat-card class="table-card">
        <mat-table [dataSource]="dataSource" class="admin-table">
          <ng-container *ngFor="let column of displayedColumns" [matColumnDef]="column.key">
            <mat-header-cell *matHeaderCellDef [mat-sort-header]="column.sortable ? column.key : null">
              {{column.label}}
            </mat-header-cell>
            <mat-cell *matCellDef="let row">
              <ng-container [ngSwitch]="column.type">
                <!-- Text -->
                <span *ngSwitchCase="'text'">{{getValue(row, column.key)}}</span>
                
                <!-- Badge -->
                <span *ngSwitchCase="'badge'" 
                      class="badge" 
                      [ngClass]="getBadgeClass(getValue(row, column.key))">
                  {{getValue(row, column.key)}}
                </span>
                
                <!-- Actions -->
                <div *ngSwitchCase="'actions'" class="actions-cell">
                  <button *ngFor="let action of column.actions" 
                          mat-icon-button 
                          [color]="action.color"
                          (click)="onAction(action.name, row)"
                          [matTooltip]="action.label">
                    <mat-icon>{{action.icon}}</mat-icon>
                  </button>
                </div>
              </ng-container>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="getColumnKeys()"></mat-header-row>
          <mat-row *matRowDef="let row; columns: getColumnKeys();"></mat-row>
        </mat-table>

        <!-- Pagination -->
        <mat-paginator 
          [length]="totalItems"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 25, 50, 100]"
          (page)="onPageChange($event)">
        </mat-paginator>
      </mat-card>
    </div>
  `
})
export class AdminDataTableComponent implements OnInit {
  @Input() config!: TableConfig;
  @Input() data: any[] = [];
  @Input() totalItems: number = 0;
  @Input() loading: boolean = false;
  @Output() actionClicked = new EventEmitter<{action: string, row: any}>();
  @Output() filterChanged = new EventEmitter<any>();
  @Output() pageChanged = new EventEmitter<any>();

  dataSource = new MatTableDataSource();
  searchTerm: string = '';
  selectedStatus: string = '';
  pageSize: number = 25;
  
  get displayedColumns() {
    return this.config.columns;
  }
  
  get statuses() {
    return this.config.filters?.statuses || [];
  }

  ngOnInit() {
    this.dataSource.data = this.data;
  }

  onAction(action: string, row: any) {
    this.actionClicked.emit({ action, row });
  }

  onFilterChange() {
    this.filterChanged.emit({
      search: this.searchTerm,
      status: this.selectedStatus
    });
  }

  onPageChange(event: PageEvent) {
    this.pageChanged.emit({
      page: event.pageIndex + 1,
      limit: event.pageSize
    });
  }
}

interface TableConfig {
  columns: TableColumn[];
  filters?: {
    statuses: { value: string; label: string }[];
  };
}

interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'badge' | 'date' | 'currency' | 'actions';
  sortable?: boolean;
  actions?: TableAction[];
}

interface TableAction {
  name: string;
  label: string;
  icon: string;
  color?: 'primary' | 'accent' | 'warn';
}
```

### 📊 **Charts Components**
```typescript
@Component({
  selector: 'app-admin-chart',
  template: `
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>{{title}}</mat-card-title>
        <mat-card-subtitle>{{subtitle}}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-container">
          <canvas #chartCanvas></canvas>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class AdminChartComponent implements OnInit, OnChanges {
  @Input() type: 'line' | 'bar' | 'doughnut' | 'pie' = 'line';
  @Input() data!: ChartData;
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() options?: ChartOptions;
  @ViewChild('chartCanvas', { static: true }) canvasRef!: ElementRef;

  private chart?: Chart;

  ngOnInit() {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.chart) {
      this.updateChart();
    }
  }

  private createChart() {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    
    this.chart = new Chart(ctx, {
      type: this.type,
      data: this.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.options
      }
    });
  }

  private updateChart() {
    if (this.chart) {
      this.chart.data = this.data;
      this.chart.update();
    }
  }
}
```

---

## 🚀 COMPOSANTS PAGES PRINCIPALES

### 🏠 **Dashboard Admin**
```typescript
@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="admin-dashboard">
      <div class="dashboard-header">
        <h1>Tableau de bord administrateur</h1>
        <div class="dashboard-actions">
          <mat-form-field>
            <mat-label>Période</mat-label>
            <mat-select [(ngModel)]="selectedPeriod" (selectionChange)="onPeriodChange()">
              <mat-option value="7d">7 jours</mat-option>
              <mat-option value="30d">30 jours</mat-option>
              <mat-option value="90d">90 jours</mat-option>
              <mat-option value="1y">1 an</mat-option>
            </mat-select>
          </mat-form-field>
          
          <button mat-raised-button color="primary" (click)="onRefresh()">
            <mat-icon>refresh</mat-icon>
            Actualiser
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <app-stats-card 
          type="primary"
          icon="people"
          [value]="dashboardData?.userStats?.total_users || 0"
          label="Utilisateurs totaux"
          [change]="getUsersGrowth()">
        </app-stats-card>
        
        <app-stats-card 
          type="success"
          icon="euro"
          [value]="dashboardData?.orderStats?.total_revenue || 0"
          label="Revenus totaux"
          [change]="getRevenueGrowth()">
        </app-stats-card>
        
        <app-stats-card 
          type="warning"
          icon="shopping_cart"
          [value]="dashboardData?.orderStats?.total_orders || 0"
          label="Commandes totales"
          [change]="getOrdersGrowth()">
        </app-stats-card>
        
        <app-stats-card 
          type="info"
          icon="store"
          [value]="dashboardData?.storeStats?.total_stores || 0"
          label="Boutiques actives"
          [change]="getStoresGrowth()">
        </app-stats-card>
      </div>

      <div class="dashboard-content">
        <div class="dashboard-row">
          <!-- Graphique revenus -->
          <div class="dashboard-col-8">
            <app-admin-chart
              type="line"
              title="Évolution des revenus"
              subtitle="Revenus par jour sur la période sélectionnée"
              [data]="revenueChartData">
            </app-admin-chart>
          </div>
          
          <!-- Top produits -->
          <div class="dashboard-col-4">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Top Produits</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="top-products-list">
                  <div *ngFor="let product of topProducts" class="top-product-item">
                    <div class="product-info">
                      <div class="product-name">{{product.name}}</div>
                      <div class="product-sales">{{product.sales}} ventes</div>
                    </div>
                    <div class="product-revenue">
                      {{product.revenue | currency:'EUR':'symbol':'1.0-0'}}
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>

        <div class="dashboard-row">
          <!-- Activité récente -->
          <div class="dashboard-col-6">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Activité récente</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="activity-list">
                  <div *ngFor="let activity of recentActivity" class="activity-item">
                    <div class="activity-icon">
                      <mat-icon [ngClass]="activity.type">{{activity.icon}}</mat-icon>
                    </div>
                    <div class="activity-content">
                      <div class="activity-text">{{activity.description}}</div>
                      <div class="activity-time">{{activity.created_at | date:'short'}}</div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
          
          <!-- Alertes système -->
          <div class="dashboard-col-6">
            <mat-card>
              <mat-card-header>
                <mat-card-title>
                  Alertes système
                  <mat-chip-list>
                    <mat-chip color="warn" *ngIf="alertsCount > 0">{{alertsCount}}</mat-chip>
                  </mat-chip-list>
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="alerts-list">
                  <div *ngFor="let alert of systemAlerts" 
                       class="alert-item" 
                       [ngClass]="alert.severity">
                    <mat-icon>{{getAlertIcon(alert.severity)}}</mat-icon>
                    <div class="alert-content">
                      <div class="alert-message">{{alert.message}}</div>
                      <div class="alert-time">{{alert.timestamp | date:'short'}}</div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  dashboardData: DashboardData | null = null;
  selectedPeriod: string = '30d';
  revenueChartData: ChartData | null = null;
  topProducts: any[] = [];
  recentActivity: any[] = [];
  systemAlerts: any[] = [];
  alertsCount: number = 0;

  constructor(
    private dashboardService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      this.dashboardData = await this.dashboardService.getDashboardData(this.selectedPeriod).toPromise();
      this.prepareChartData();
      this.loadRecentActivity();
      this.loadSystemAlerts();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    }
  }

  onPeriodChange() {
    this.loadDashboardData();
  }

  onRefresh() {
    this.loadDashboardData();
  }

  getUsersGrowth(): number {
    // Calcul du taux de croissance des utilisateurs
    if (!this.dashboardData?.userStats) return 0;
    return Math.round((this.dashboardData.userStats.new_users_30d / this.dashboardData.userStats.total_users) * 100);
  }

  getRevenueGrowth(): number {
    // Calcul basé sur la comparaison période précédente
    return 12.5; // Exemple
  }

  getOrdersGrowth(): number {
    // Calcul basé sur la comparaison période précédente
    return 8.3; // Exemple
  }

  getStoresGrowth(): number {
    // Calcul basé sur la comparaison période précédente
    return 5.7; // Exemple
  }

  private prepareChartData() {
    // Préparer les données pour le graphique des revenus
    this.revenueChartData = {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [{
        label: 'Revenus (€)',
        data: [1200, 1900, 3000, 5000, 2000, 3000, 4500],
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        tension: 0.4
      }]
    };
  }

  private async loadRecentActivity() {
    try {
      // Charger l'activité récente
      this.recentActivity = [
        {
          type: 'order',
          icon: 'shopping_cart',
          description: 'Nouvelle commande #CMD-001234',
          created_at: new Date()
        },
        // ... autres activités
      ];
    } catch (error) {
      console.error('Erreur chargement activité:', error);
    }
  }

  private async loadSystemAlerts() {
    try {
      // Charger les alertes système
      this.systemAlerts = [];
      this.alertsCount = this.systemAlerts.length;
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    }
  }

  getAlertIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notification_important';
    }
  }
}
```

Votre backend AfrikMode offre une **interface admin complète** avec toutes les fonctionnalités nécessaires pour gérer efficacement votre plateforme e-commerce ! 🎯🚀

Cette documentation vous donne tout ce qu'il faut pour construire une interface admin professionnelle avec Angular Material.