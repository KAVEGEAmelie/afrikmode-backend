# 📊 INTERFACE MANAGER - AFRIKMODE

## 🎯 VUE D'ENSEMBLE

L'interface Manager d'AfrikMode offre des outils de gestion intermédiaires, axés sur le support client, la modération de base et le suivi des opérations quotidiennes. Les managers ont un accès contrôlé aux fonctionnalités administratives.

### 🏛️ **Rôle Manager**
- **Support client avancé** avec gestion complète des tickets
- **Modération** des contenus et utilisateurs
- **Rapports** opérationnels et statistiques limitées
- **Suivi** des boutiques et produits
- **Pas d'accès** aux configurations système critiques

---

## 🎫 SUPPORT CLIENT (PRIORITÉ PRINCIPALE)

### 📋 **Dashboard Support**
**Endpoint**: `GET /api/tickets/admin?agent=me&status=all`

```typescript
interface ManagerSupportDashboard {
  myTickets: {
    assigned_to_me: number;
    in_progress: number;
    resolved_today: number;
    overdue: number;
    avg_response_time: number; // minutes
  };
  teamStats: {
    total_open: number;
    team_workload: {
      agent_name: string;
      tickets_assigned: number;
      avg_resolution_time: number;
    }[];
  };
  performance: {
    my_resolution_rate: number;
    satisfaction_score: number;
    tickets_resolved_this_week: number;
    response_time_target: number; // minutes
  };
}
```

### 🎯 **Gestion des Tickets**

#### 📨 **Mes Tickets**
```typescript
@Component({
  selector: 'app-manager-tickets',
  template: `
    <div class="manager-tickets">
      <div class="tickets-header">
        <h2>Mes Tickets Support</h2>
        <div class="quick-stats">
          <div class="stat-card urgent">
            <span class="number">{{urgentTickets}}</span>
            <span class="label">Urgents</span>
          </div>
          <div class="stat-card pending">
            <span class="number">{{pendingTickets}}</span>
            <span class="label">En attente</span>
          </div>
          <div class="stat-card resolved">
            <span class="number">{{resolvedToday}}</span>
            <span class="label">Résolus aujourd'hui</span>
          </div>
        </div>
      </div>

      <mat-card class="tickets-filters">
        <div class="filter-row">
          <mat-form-field>
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="selectedStatus" (selectionChange)="onFilterChange()">
              <mat-option value="">Tous mes tickets</mat-option>
              <mat-option value="open">Ouverts</mat-option>
              <mat-option value="in_progress">En cours</mat-option>
              <mat-option value="pending_customer">Attente client</mat-option>
              <mat-option value="resolved">Résolus</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Priorité</mat-label>
            <mat-select [(ngModel)]="selectedPriority" (selectionChange)="onFilterChange()">
              <mat-option value="">Toutes</mat-option>
              <mat-option value="urgent">Urgente</mat-option>
              <mat-option value="high">Haute</mat-option>
              <mat-option value="medium">Moyenne</mat-option>
              <mat-option value="low">Basse</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Catégorie</mat-label>
            <mat-select [(ngModel)]="selectedCategory" (selectionChange)="onFilterChange()">
              <mat-option value="">Toutes</mat-option>
              <mat-option value="order_issue">Problème commande</mat-option>
              <mat-option value="payment_problem">Problème paiement</mat-option>
              <mat-option value="account_help">Aide compte</mat-option>
              <mat-option value="technical_issue">Problème technique</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </mat-card>

      <mat-card class="tickets-table">
        <mat-table [dataSource]="ticketsDataSource" class="manager-table">
          <ng-container matColumnDef="ticket_number">
            <mat-header-cell *matHeaderCellDef>Numéro</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <div class="ticket-number">
                <span>{{ticket.ticket_number}}</span>
                <mat-chip *ngIf="ticket.priority === 'urgent'" color="warn" selected>URGENT</mat-chip>
              </div>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="customer">
            <mat-header-cell *matHeaderCellDef>Client</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <div class="customer-info">
                <div class="customer-name">{{ticket.customer.name}}</div>
                <div class="customer-tier">{{ticket.customer.tier | titlecase}}</div>
              </div>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="subject">
            <mat-header-cell *matHeaderCellDef>Sujet</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <div class="ticket-subject">
                <div class="subject-text">{{ticket.subject}}</div>
                <div class="ticket-category">{{getCategoryLabel(ticket.category)}}</div>
              </div>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="status">
            <mat-header-cell *matHeaderCellDef>Statut</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <mat-chip [ngClass]="getStatusClass(ticket.status)" selected>
                {{getStatusLabel(ticket.status)}}
              </mat-chip>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="priority">
            <mat-header-cell *matHeaderCellDef>Priorité</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <mat-chip [ngClass]="getPriorityClass(ticket.priority)" selected>
                {{ticket.priority | titlecase}}
              </mat-chip>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="last_activity">
            <mat-header-cell *matHeaderCellDef>Dernière activité</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <div class="last-activity">
                <div>{{ticket.last_response_at | timeAgo}}</div>
                <div class="activity-indicator" [ngClass]="getActivityClass(ticket)"></div>
              </div>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="actions">
            <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
            <mat-cell *matCellDef="let ticket">
              <div class="ticket-actions">
                <button mat-icon-button color="primary" 
                        (click)="openTicket(ticket)"
                        matTooltip="Ouvrir ticket">
                  <mat-icon>open_in_new</mat-icon>
                </button>
                
                <button mat-icon-button color="accent"
                        (click)="quickReply(ticket)"
                        matTooltip="Réponse rapide">
                  <mat-icon>quick_reply</mat-icon>
                </button>
                
                <button mat-icon-button 
                        [color]="ticket.status === 'resolved' ? 'warn' : 'primary'"
                        (click)="toggleTicketStatus(ticket)"
                        [matTooltip]="ticket.status === 'resolved' ? 'Rouvrir' : 'Marquer résolu'">
                  <mat-icon>{{ticket.status === 'resolved' ? 'undo' : 'check_circle'}}</mat-icon>
                </button>
              </div>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="['ticket_number', 'customer', 'subject', 'status', 'priority', 'last_activity', 'actions']"></mat-header-row>
          <mat-row *matRowDef="let row; columns: ['ticket_number', 'customer', 'subject', 'status', 'priority', 'last_activity', 'actions'];"></mat-row>
        </mat-table>

        <mat-paginator [length]="totalTickets" [pageSize]="25" [pageSizeOptions]="[10, 25, 50]"></mat-paginator>
      </mat-card>
    </div>
  `
})
export class ManagerTicketsComponent implements OnInit {
  ticketsDataSource = new MatTableDataSource();
  selectedStatus = '';
  selectedPriority = '';
  selectedCategory = '';
  
  urgentTickets = 0;
  pendingTickets = 0;
  resolvedToday = 0;
  totalTickets = 0;

  constructor(
    private ticketService: ManagerTicketService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadMyTickets();
    this.loadStats();
  }

  async loadMyTickets() {
    try {
      const response = await this.ticketService.getMyTickets({
        status: this.selectedStatus,
        priority: this.selectedPriority,
        category: this.selectedCategory
      }).toPromise();
      
      this.ticketsDataSource.data = response.tickets;
      this.totalTickets = response.total;
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
    }
  }

  async loadStats() {
    try {
      const stats = await this.ticketService.getMyStats().toPromise();
      this.urgentTickets = stats.urgent_count;
      this.pendingTickets = stats.pending_count;
      this.resolvedToday = stats.resolved_today;
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  }

  openTicket(ticket: any) {
    this.dialog.open(TicketDetailDialogComponent, {
      width: '80vw',
      height: '90vh',
      data: { ticket }
    });
  }

  quickReply(ticket: any) {
    this.dialog.open(QuickReplyDialogComponent, {
      width: '600px',
      data: { ticket }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.loadMyTickets();
      }
    });
  }

  async toggleTicketStatus(ticket: any) {
    const newStatus = ticket.status === 'resolved' ? 'open' : 'resolved';
    try {
      await this.ticketService.updateTicketStatus(ticket.id, newStatus).toPromise();
      this.loadMyTickets();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    }
  }

  onFilterChange() {
    this.loadMyTickets();
  }

  getCategoryLabel(category: string): string {
    const labels = {
      'order_issue': 'Problème commande',
      'payment_problem': 'Problème paiement',
      'account_help': 'Aide compte',
      'technical_issue': 'Problème technique'
    };
    return labels[category] || category;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusLabel(status: string): string {
    const labels = {
      'open': 'Ouvert',
      'in_progress': 'En cours',
      'pending_customer': 'Attente client',
      'resolved': 'Résolu',
      'closed': 'Fermé'
    };
    return labels[status] || status;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getActivityClass(ticket: any): string {
    const lastActivity = new Date(ticket.last_response_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 3600);
    
    if (hoursDiff > 24) return 'overdue';
    if (hoursDiff > 4) return 'warning';
    return 'active';
  }
}
```

---

## 👥 MODÉRATION UTILISATEURS

### 🔍 **Surveillance Utilisateurs**
**Permissions Manager**: Modération de base, suspension temporaire

```typescript
interface UserModerationView {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login: string;
  recent_activity: {
    orders_count: number;
    reviews_count: number;
    support_tickets: number;
    complaints_received: number;
  };
  risk_score: number; // 0-100
  flags: {
    type: 'suspicious_activity' | 'multiple_complaints' | 'payment_issues';
    count: number;
    last_flagged: string;
  }[];
}
```

### ⚠️ **Actions de Modération**
```typescript
// Suspendre utilisateur temporairement (max 30 jours pour manager)
POST /api/users/:id/suspend
{
  reason: string;
  duration: number; // 1-30 jours max
  notify_user: boolean;
  escalate_to_admin?: boolean;
}

// Ajouter un avertissement
POST /api/users/:id/warning
{
  reason: string;
  severity: 'minor' | 'moderate' | 'serious';
  message: string;
}

// Signaler à l'admin pour actions avancées
POST /api/users/:id/escalate
{
  reason: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high';
  recommended_action: string;
}
```

---

## 🏪 SURVEILLANCE DES BOUTIQUES

### 📊 **Dashboard Boutiques Manager**
```typescript
interface ManagerStoresDashboard {
  summary: {
    stores_under_review: number;
    flagged_stores: number;
    new_applications: number;
    my_assigned_stores: number;
  };
  pending_reviews: {
    store_id: string;
    store_name: string;
    owner_name: string;
    application_date: string;
    documents_complete: boolean;
    risk_assessment: 'low' | 'medium' | 'high';
  }[];
  flagged_content: {
    store_id: string;
    store_name: string;
    issue_type: string;
    severity: string;
    flagged_by: string;
    date_flagged: string;
  }[];
}
```

### ✅ **Révision des Boutiques**
```typescript
// Pré-approuver boutique (recommandation pour admin)
POST /api/stores/:id/pre-approve
{
  manager_notes: string;
  risk_assessment: 'low' | 'medium' | 'high';
  recommended_approval: boolean;
  conditions: string[];
  follow_up_required: boolean;
}

// Demander des informations complémentaires
POST /api/stores/:id/request-info
{
  requested_documents: string[];
  questions: string[];
  deadline: string; // ISO date
  message_to_owner: string;
}

// Signaler problème
POST /api/stores/:id/flag-issue
{
  issue_type: 'document_fraud' | 'suspicious_products' | 'policy_violation';
  description: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
  escalate_immediately: boolean;
}
```

---

## 📈 RAPPORTS ET STATISTIQUES

### 📊 **Rapports Manager**
**Accès limité aux rapports opérationnels**

```typescript
interface ManagerReports {
  support_performance: {
    my_stats: {
      tickets_handled: number;
      avg_resolution_time: number;
      satisfaction_score: number;
      response_time_sla_compliance: number;
    };
    team_comparison: {
      my_ranking: number;
      total_agents: number;
      performance_percentile: number;
    };
  };
  moderation_activity: {
    users_moderated: number;
    stores_reviewed: number;
    escalations_made: number;
    accuracy_rate: number; // % des décisions confirmées par admin
  };
  workload_distribution: {
    current_assignments: number;
    avg_daily_workload: number;
    peak_hours: { hour: number; workload: number }[];
    capacity_utilization: number;
  };
}
```

### 📋 **Générer Rapport**
```typescript
@Component({
  selector: 'app-manager-reports',
  template: `
    <div class="manager-reports">
      <mat-card class="report-generator">
        <mat-card-header>
          <mat-card-title>Générer Rapport</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="report-form">
            <mat-form-field>
              <mat-label>Type de rapport</mat-label>
              <mat-select [(ngModel)]="selectedReportType">
                <mat-option value="support_performance">Performance Support</mat-option>
                <mat-option value="moderation_activity">Activité Modération</mat-option>
                <mat-option value="my_workload">Ma Charge de Travail</mat-option>
                <mat-option value="team_overview">Vue d'ensemble Équipe</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Période</mat-label>
              <mat-select [(ngModel)]="selectedPeriod">
                <mat-option value="today">Aujourd'hui</mat-option>
                <mat-option value="week">Cette semaine</mat-option>
                <mat-option value="month">Ce mois</mat-option>
                <mat-option value="quarter">Ce trimestre</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="generateReport()">
              <mat-icon>assessment</mat-icon>
              Générer
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="performance-overview" *ngIf="performanceData">
        <mat-card-header>
          <mat-card-title>Ma Performance</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="performance-grid">
            <div class="performance-metric">
              <div class="metric-value">{{performanceData.tickets_resolved}}</div>
              <div class="metric-label">Tickets Résolus</div>
              <div class="metric-change positive">+12%</div>
            </div>
            
            <div class="performance-metric">
              <div class="metric-value">{{performanceData.avg_resolution_time}}h</div>
              <div class="metric-label">Temps Moyen Résolution</div>
              <div class="metric-change negative">-8%</div>
            </div>
            
            <div class="performance-metric">
              <div class="metric-value">{{performanceData.satisfaction_score}}/5</div>
              <div class="metric-label">Satisfaction Client</div>
              <div class="metric-change positive">+0.2</div>
            </div>
            
            <div class="performance-metric">
              <div class="metric-value">{{performanceData.sla_compliance}}%</div>
              <div class="metric-label">Respect SLA</div>
              <div class="metric-change" [ngClass]="getSlaClass()">{{getSlaChange()}}</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="reports-grid">
        <mat-card class="weekly-summary">
          <mat-card-header>
            <mat-card-title>Résumé Hebdomadaire</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <canvas #weeklyChart width="400" height="200"></canvas>
          </mat-card-content>
        </mat-card>

        <mat-card class="team-leaderboard">
          <mat-card-header>
            <mat-card-title>Classement Équipe</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="leaderboard">
              <div *ngFor="let agent of teamLeaderboard; let i = index" 
                   class="leaderboard-item"
                   [ngClass]="{'my-position': agent.is_me}">
                <div class="position">{{i + 1}}</div>
                <div class="agent-info">
                  <div class="agent-name">{{agent.name}}</div>
                  <div class="agent-score">{{agent.score}} pts</div>
                </div>
                <div class="agent-badge" *ngIf="i < 3">
                  <mat-icon [ngClass]="getBadgeClass(i)">{{getBadgeIcon(i)}}</mat-icon>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class ManagerReportsComponent implements OnInit {
  selectedReportType = 'support_performance';
  selectedPeriod = 'week';
  performanceData: any = null;
  teamLeaderboard: any[] = [];
  
  @ViewChild('weeklyChart') weeklyChart!: ElementRef;
  private chart?: Chart;

  constructor(
    private reportsService: ManagerReportsService
  ) {}

  ngOnInit() {
    this.loadPerformanceData();
    this.loadTeamLeaderboard();
  }

  ngAfterViewInit() {
    this.initWeeklyChart();
  }

  async generateReport() {
    try {
      const report = await this.reportsService.generateReport(
        this.selectedReportType, 
        this.selectedPeriod
      ).toPromise();
      
      this.downloadReport(report);
    } catch (error) {
      console.error('Erreur génération rapport:', error);
    }
  }

  async loadPerformanceData() {
    try {
      this.performanceData = await this.reportsService.getMyPerformance().toPromise();
    } catch (error) {
      console.error('Erreur chargement performance:', error);
    }
  }

  async loadTeamLeaderboard() {
    try {
      this.teamLeaderboard = await this.reportsService.getTeamLeaderboard().toPromise();
    } catch (error) {
      console.error('Erreur chargement classement:', error);
    }
  }

  private initWeeklyChart() {
    const ctx = this.weeklyChart.nativeElement.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
          label: 'Tickets Résolus',
          data: [12, 15, 18, 14, 20, 8, 10],
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  downloadReport(report: any) {
    const blob = new Blob([report.data], { type: report.mime_type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getSlaClass(): string {
    return this.performanceData?.sla_compliance >= 95 ? 'positive' : 'negative';
  }

  getSlaChange(): string {
    const change = this.performanceData?.sla_change || 0;
    return change >= 0 ? `+${change}%` : `${change}%`;
  }

  getBadgeClass(position: number): string {
    const classes = ['gold-badge', 'silver-badge', 'bronze-badge'];
    return classes[position] || '';
  }

  getBadgeIcon(position: number): string {
    const icons = ['emoji_events', 'military_tech', 'workspace_premium'];
    return icons[position] || 'star';
  }
}
```

---

## 🔔 NOTIFICATIONS MANAGER

### 📢 **Types de Notifications**
```typescript
interface ManagerNotifications {
  ticket_assignments: {
    new_ticket_assigned: boolean;
    escalated_ticket: boolean;
    overdue_reminder: boolean;
    customer_response: boolean;
  };
  moderation_alerts: {
    flagged_content: boolean;
    user_reports: boolean;
    suspicious_activity: boolean;
    review_deadlines: boolean;
  };
  performance_updates: {
    daily_summary: boolean;
    weekly_report: boolean;
    target_reminders: boolean;
    team_updates: boolean;
  };
}
```

### ⚙️ **Configuration Notifications**
```typescript
@Component({
  selector: 'app-manager-notification-settings',
  template: `
    <mat-card class="notification-settings">
      <mat-card-header>
        <mat-card-title>Préférences de Notification</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="settings-sections">
          <!-- Support Client -->
          <div class="settings-section">
            <h3>Support Client</h3>
            <div class="settings-group">
              <mat-slide-toggle [(ngModel)]="settings.ticket_assignments.new_ticket_assigned">
                Nouveau ticket assigné
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.ticket_assignments.escalated_ticket">
                Ticket escaladé
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.ticket_assignments.overdue_reminder">
                Rappel tickets en retard
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.ticket_assignments.customer_response">
                Réponse client
              </mat-slide-toggle>
            </div>
          </div>

          <!-- Modération -->
          <div class="settings-section">
            <h3>Modération</h3>
            <div class="settings-group">
              <mat-slide-toggle [(ngModel)]="settings.moderation_alerts.flagged_content">
                Contenu signalé
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.moderation_alerts.user_reports">
                Signalements utilisateurs
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.moderation_alerts.suspicious_activity">
                Activité suspecte
              </mat-slide-toggle>
            </div>
          </div>

          <!-- Performance -->
          <div class="settings-section">
            <h3>Performance</h3>
            <div class="settings-group">
              <mat-slide-toggle [(ngModel)]="settings.performance_updates.daily_summary">
                Résumé quotidien
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.performance_updates.weekly_report">
                Rapport hebdomadaire
              </mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="settings.performance_updates.target_reminders">
                Rappels objectifs
              </mat-slide-toggle>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button mat-raised-button color="primary" (click)="saveSettings()">
            Enregistrer
          </button>
          <button mat-stroked-button (click)="resetSettings()">
            Réinitialiser
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class ManagerNotificationSettingsComponent implements OnInit {
  settings: ManagerNotifications = {
    ticket_assignments: {
      new_ticket_assigned: true,
      escalated_ticket: true,
      overdue_reminder: true,
      customer_response: true
    },
    moderation_alerts: {
      flagged_content: true,
      user_reports: true,
      suspicious_activity: true,
      review_deadlines: true
    },
    performance_updates: {
      daily_summary: true,
      weekly_report: true,
      target_reminders: false,
      team_updates: true
    }
  };

  constructor(
    private notificationService: ManagerNotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    try {
      this.settings = await this.notificationService.getSettings().toPromise();
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  }

  async saveSettings() {
    try {
      await this.notificationService.updateSettings(this.settings).toPromise();
      this.snackBar.open('Paramètres enregistrés', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    }
  }

  resetSettings() {
    this.loadSettings(); // Recharge les paramètres depuis le serveur
  }
}
```

---

## 🎯 SERVICES ANGULAR MANAGER

### 🔧 **Manager Service Principal**
```typescript
@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboardData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/manager/dashboard`);
  }

  // Tickets
  getMyTickets(filters: any = {}): Observable<any> {
    const params = new HttpParams({ fromObject: filters });
    return this.http.get(`${this.apiUrl}/tickets/admin`, { params });
  }

  getMyTicketStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tickets/admin/my-stats`);
  }

  updateTicketStatus(ticketId: string, status: string, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/tickets/${ticketId}/status`, {
      status,
      admin_notes: notes
    });
  }

  assignTicket(ticketId: string, agentId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/tickets/${ticketId}/assign`, {
      agent_id: agentId
    });
  }

  // Modération utilisateurs
  flagUser(userId: string, reason: string, severity: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/flag`, {
      reason,
      severity
    });
  }

  suspendUser(userId: string, duration: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/suspend`, {
      duration,
      reason,
      notify_user: true
    });
  }

  warnUser(userId: string, warning: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/warning`, warning);
  }

  // Boutiques
  getStoresForReview(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stores/pending-review`);
  }

  preApproveStore(storeId: string, assessment: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stores/${storeId}/pre-approve`, assessment);
  }

  requestStoreInfo(storeId: string, request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stores/${storeId}/request-info`, request);
  }

  // Rapports
  generateReport(type: string, period: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/manager/generate`, {
      type,
      period,
      format: 'pdf'
    });
  }

  getMyPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/manager/performance`);
  }
}
```

---

## 🏗️ STRUCTURE RECOMMANDÉE

### 📁 **Organisation des Fichiers**
```
src/app/manager/
├── shared/
│   ├── components/
│   │   ├── manager-layout/
│   │   ├── manager-header/
│   │   ├── manager-sidebar/
│   │   ├── ticket-card/
│   │   ├── quick-actions/
│   │   └── performance-widget/
│   ├── services/
│   │   ├── manager.service.ts
│   │   ├── manager-tickets.service.ts
│   │   ├── manager-reports.service.ts
│   │   └── manager-notifications.service.ts
│   └── guards/
│       └── manager.guard.ts
├── dashboard/
│   └── manager-dashboard.component.ts
├── support/
│   ├── my-tickets/
│   ├── ticket-detail/
│   ├── quick-reply/
│   └── support-stats/
├── moderation/
│   ├── users-review/
│   ├── stores-review/
│   └── content-flags/
├── reports/
│   ├── performance-reports/
│   ├── team-comparison/
│   └── workload-analysis/
└── settings/
    └── notification-preferences/
```

### 🎨 **Thème Manager**
```scss
// manager-theme.scss
.manager-interface {
  --primary-color: #2e7d32;      // Vert professionnel
  --secondary-color: #1976d2;    // Bleu support
  --accent-color: #ff9800;       // Orange alertes
  --success-color: #4caf50;      // Vert succès
  --warning-color: #ff9800;      // Orange warning
  --error-color: #f44336;        // Rouge erreur
  
  .manager-card {
    border-left: 4px solid var(--primary-color);
    margin-bottom: 16px;
    
    &.urgent {
      border-left-color: var(--error-color);
      background: rgba(244, 67, 54, 0.05);
    }
    
    &.high-priority {
      border-left-color: var(--warning-color);
      background: rgba(255, 152, 0, 0.05);
    }
  }
  
  .performance-metric {
    padding: 16px;
    border-radius: 8px;
    background: #fafafa;
    text-align: center;
    
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: var(--primary-color);
    }
    
    .metric-change {
      font-size: 0.9em;
      font-weight: 600;
      
      &.positive {
        color: var(--success-color);
      }
      
      &.negative {
        color: var(--error-color);
      }
    }
  }
}
```

---

Cette interface manager offre un **équilibre parfait** entre les responsabilités opérationnelles et les restrictions de sécurité, avec tous les outils nécessaires pour un travail efficace ! 📊🎯