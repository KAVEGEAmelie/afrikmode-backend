# 🎯 GUIDE D'INTÉGRATION FRONTEND - AFRIKMODE

## 🚀 DÉMARRAGE RAPIDE

### 📡 Configuration de Base

**URL de l'API**: `http://localhost:5000/api`
**Documentation Swagger**: `http://localhost:5000/api/docs`

### 🔑 Headers Obligatoires

```javascript
// Pour toutes les requêtes
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Language': 'fr', // ou 'en'
  'X-Currency': 'EUR' // ou 'USD', 'XOF', etc.
}

// Pour les requêtes authentifiées
const authHeaders = {
  ...headers,
  'Authorization': `Bearer ${jwt_token}`
}
```

---

## 🔐 AUTHENTIFICATION

### 📝 **1. Inscription**
```javascript
// POST /api/auth/register
const register = async (userData) => {
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+33123456789',
      role: 'customer', // 'customer', 'vendor', 'admin'
      referral_code: 'ABC123' // optionnel
    })
  })
  
  const data = await response.json()
  // Réponse: { success: true, user: {...}, token: "jwt...", message: "..." }
}
```

### 🔑 **2. Connexion**
```javascript
// POST /api/auth/login
const login = async (credentials) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
      two_factor_code: '123456' // Si 2FA activé
    })
  })
  
  const data = await response.json()
  if (data.success) {
    // Stocker le token
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('refresh_token', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
  }
}
```

### 🔄 **3. Renouvellement Token**
```javascript
// POST /api/auth/refresh-token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token')
  
  const response = await fetch('http://localhost:5000/api/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  })
  
  const data = await response.json()
  if (data.success) {
    localStorage.setItem('auth_token', data.token)
    return data.token
  }
  
  // Token expiré, rediriger vers login
  window.location.href = '/login'
}
```

### 🚪 **4. Déconnexion**
```javascript
// POST /api/auth/logout
const logout = async () => {
  const token = localStorage.getItem('auth_token')
  
  await fetch('http://localhost:5000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  // Nettoyer le localStorage
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}
```

---

## 🏪 BOUTIQUES & PRODUITS

### 🏪 **1. Lister les Boutiques**
```javascript
// GET /api/stores
const getStores = async (page = 1, limit = 10) => {
  const response = await fetch(
    `http://localhost:5000/api/stores?page=${page}&limit=${limit}&status=active`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'fr'
      }
    }
  )
  
  const data = await response.json()
  // Réponse: { stores: [...], pagination: { page, limit, total, pages } }
}
```

### 📦 **2. Lister les Produits**
```javascript
// GET /api/products
const getProducts = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    category: filters.category || '',
    store_id: filters.store_id || '',
    min_price: filters.min_price || '',
    max_price: filters.max_price || '',
    search: filters.search || '',
    sort: filters.sort || 'created_at', // 'price_asc', 'price_desc', 'popular'
    currency: 'EUR'
  })
  
  const response = await fetch(
    `http://localhost:5000/api/products?${params}`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'fr',
        'X-Currency': 'EUR'
      }
    }
  )
  
  const data = await response.json()
  // Réponse: { products: [...], pagination: {...}, filters: {...} }
}
```

### 🔍 **3. Détails Produit**
```javascript
// GET /api/products/:id
const getProduct = async (productId) => {
  const response = await fetch(
    `http://localhost:5000/api/products/${productId}`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'fr',
        'X-Currency': 'EUR'
      }
    }
  )
  
  const data = await response.json()
  /* Réponse:
  {
    id: "uuid",
    name: "Nom du produit",
    description: "Description...",
    price: 29.99,
    discounted_price: 24.99,
    currency: "EUR",
    images: ["url1", "url2"],
    variants: [
      { id: "variant-1", name: "Couleur", options: ["Rouge", "Bleu"] },
      { id: "variant-2", name: "Taille", options: ["S", "M", "L"] }
    ],
    specifications: {...},
    category: {...},
    store: {...},
    reviews: [...],
    stock_quantity: 15,
    is_active: true
  }
  */
}
```

---

## 🛒 COMMANDES

### 🛒 **1. Créer une Commande**
```javascript
// POST /api/orders
const createOrder = async (orderData) => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Currency': 'EUR'
    },
    body: JSON.stringify({
      items: [
        {
          product_id: 'product-uuid',
          variant_selections: {
            'variant-1': 'Rouge',
            'variant-2': 'M'
          },
          quantity: 2,
          unit_price: 24.99
        }
      ],
      shipping_address: {
        street: '123 Rue Example',
        city: 'Paris',
        postal_code: '75001',
        country: 'France',
        full_name: 'John Doe',
        phone: '+33123456789'
      },
      billing_address: { /* même format */ },
      coupon_code: 'WELCOME10', // optionnel
      notes: 'Instructions spéciales'
    })
  })
  
  const data = await response.json()
  // Réponse: { success: true, order: {...}, payment_intent: {...} }
}
```

### 📋 **2. Mes Commandes**
```javascript
// GET /api/orders
const getMyOrders = async (status = 'all') => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch(
    `http://localhost:5000/api/orders?status=${status}&page=1&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }
  )
  
  const data = await response.json()
  // Réponse: { orders: [...], pagination: {...} }
}
```

---

## 💳 PAIEMENTS

### 💰 **1. Traiter un Paiement**
```javascript
// POST /api/payments/process
const processPayment = async (paymentData) => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/payments/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      order_id: 'order-uuid',
      payment_method: 'card', // 'card', 'paypal', 'mobile_money'
      payment_details: {
        card_number: '4242424242424242',
        exp_month: '12',
        exp_year: '2025',
        cvc: '123'
      },
      save_payment_method: true
    })
  })
  
  const data = await response.json()
  // Réponse: { success: true, payment: {...}, transaction_id: "..." }
}
```

### 💳 **2. Méthodes de Paiement Sauvegardées**
```javascript
// GET /api/payments/methods
const getPaymentMethods = async () => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/payments/methods', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  const data = await response.json()
  // Réponse: { payment_methods: [...] }
}
```

---

## 🔔 NOTIFICATIONS

### 📱 **1. Enregistrer Token Push**
```javascript
// POST /api/mobile/push-token
const registerPushToken = async (token) => {
  const authToken = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/mobile/push-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      token: token,
      platform: 'web', // 'web', 'android', 'ios'
      device_info: {
        browser: navigator.userAgent,
        os: navigator.platform
      }
    })
  })
}
```

### 🔔 **2. Récupérer Notifications**
```javascript
// GET /api/notifications
const getNotifications = async () => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/notifications?page=1&limit=20', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  const data = await response.json()
  // Réponse: { notifications: [...], unread_count: 5 }
}
```

---

## 🎫 SUPPORT CLIENT

### 🎫 **1. Créer un Ticket**
```javascript
// POST /api/tickets
const createTicket = async (ticketData) => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subject: 'Problème avec ma commande',
      description: 'Description détaillée du problème...',
      priority: 'medium', // 'low', 'medium', 'high', 'urgent'
      category: 'order_issue', // voir catégories disponibles
      order_id: 'order-uuid', // optionnel
      attachments: ['file-url-1', 'file-url-2']
    })
  })
  
  const data = await response.json()
  // Réponse: { success: true, ticket: {...} }
}
```

---

## 📊 INTERFACE UTILISATEUR

### 🏠 **Page d'Accueil**
```javascript
// Données nécessaires pour la page d'accueil
const getHomePageData = async () => {
  try {
    const [featuredProducts, categories, topStores] = await Promise.all([
      fetch('http://localhost:5000/api/products?featured=true&limit=8'),
      fetch('http://localhost:5000/api/categories?level=1'),
      fetch('http://localhost:5000/api/stores?featured=true&limit=6')
    ])
    
    return {
      featuredProducts: await featuredProducts.json(),
      categories: await categories.json(),
      topStores: await topStores.json()
    }
  } catch (error) {
    console.error('Erreur chargement page accueil:', error)
  }
}
```

### 🔍 **Page de Recherche**
```javascript
// Recherche avec filtres
const searchProducts = async (searchTerm, filters = {}) => {
  const params = new URLSearchParams({
    search: searchTerm,
    page: filters.page || 1,
    limit: 24,
    category: filters.category || '',
    min_price: filters.minPrice || '',
    max_price: filters.maxPrice || '',
    sort: filters.sort || 'relevance',
    in_stock: 'true'
  })
  
  const response = await fetch(`http://localhost:5000/api/products/search?${params}`)
  return await response.json()
}
```

### 👤 **Profil Utilisateur**
```javascript
// Récupérer profil utilisateur
const getUserProfile = async () => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/users/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  return await response.json()
}

// Modifier profil
const updateProfile = async (profileData) => {
  const token = localStorage.getItem('auth_token')
  
  const response = await fetch('http://localhost:5000/api/users/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  })
  
  return await response.json()
}
```

---

## 🛠️ UTILITAIRES FRONTEND

### 🔐 **Gestion d'Authentification**
```javascript
// auth.js - Service d'authentification
class AuthService {
  constructor() {
    this.token = localStorage.getItem('auth_token')
    this.user = JSON.parse(localStorage.getItem('user') || '{}')
  }
  
  isAuthenticated() {
    return !!this.token && !this.isTokenExpired()
  }
  
  isTokenExpired() {
    if (!this.token) return true
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }
  
  async refreshTokenIfNeeded() {
    if (this.isTokenExpired()) {
      await this.refreshToken()
    }
  }
  
  hasRole(role) {
    return this.user.role === role
  }
  
  hasPermission(permission) {
    return this.user.permissions?.includes(permission)
  }
}

export default new AuthService()
```

### 🌍 **Gestion Multi-langues**
```javascript
// i18n.js - Service d'internationalisation
class I18nService {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'fr'
    this.translations = {}
    this.loadTranslations()
  }
  
  async loadTranslations() {
    try {
      const response = await fetch(`http://localhost:5000/api/i18n/translations/${this.currentLanguage}`)
      this.translations = await response.json()
    } catch (error) {
      console.error('Erreur chargement traductions:', error)
    }
  }
  
  t(key, params = {}) {
    let translation = this.translations[key] || key
    
    // Remplacer les paramètres
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{{${param}}}`, params[param])
    })
    
    return translation
  }
  
  setLanguage(language) {
    this.currentLanguage = language
    localStorage.setItem('language', language)
    this.loadTranslations()
  }
}

export default new I18nService()
```

### 💱 **Gestion Multi-devises**
```javascript
// currency.js - Service de devises
class CurrencyService {
  constructor() {
    this.currentCurrency = localStorage.getItem('currency') || 'EUR'
    this.exchangeRates = {}
    this.loadExchangeRates()
  }
  
  async loadExchangeRates() {
    try {
      const response = await fetch('http://localhost:5000/api/currencies/rates')
      this.exchangeRates = await response.json()
    } catch (error) {
      console.error('Erreur chargement taux de change:', error)
    }
  }
  
  formatPrice(amount, currency = this.currentCurrency) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }
  
  convertPrice(amount, fromCurrency, toCurrency = this.currentCurrency) {
    if (fromCurrency === toCurrency) return amount
    
    const rate = this.exchangeRates[`${fromCurrency}_${toCurrency}`]
    return rate ? amount * rate : amount
  }
}

export default new CurrencyService()
```

### 🛒 **Gestion Panier**
```javascript
// cart.js - Service de panier
class CartService {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('cart') || '[]')
  }
  
  addItem(product, variantSelections = {}, quantity = 1) {
    const itemKey = this.generateItemKey(product.id, variantSelections)
    const existingItem = this.items.find(item => item.key === itemKey)
    
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      this.items.push({
        key: itemKey,
        product,
        variantSelections,
        quantity,
        addedAt: new Date().toISOString()
      })
    }
    
    this.saveCart()
  }
  
  removeItem(itemKey) {
    this.items = this.items.filter(item => item.key !== itemKey)
    this.saveCart()
  }
  
  updateQuantity(itemKey, quantity) {
    const item = this.items.find(item => item.key === itemKey)
    if (item) {
      item.quantity = Math.max(0, quantity)
      if (item.quantity === 0) {
        this.removeItem(itemKey)
      } else {
        this.saveCart()
      }
    }
  }
  
  getTotal() {
    return this.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity)
    }, 0)
  }
  
  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0)
  }
  
  clear() {
    this.items = []
    this.saveCart()
  }
  
  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.items))
  }
  
  generateItemKey(productId, variantSelections) {
    const variantKey = Object.entries(variantSelections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|')
    return `${productId}${variantKey ? '|' + variantKey : ''}`
  }
}

export default new CartService()
```

---

## ⚡ OPTIMISATIONS PERFORMANCE

### 💾 **Mise en Cache**
```javascript
// cache.js - Service de cache frontend
class CacheService {
  constructor() {
    this.cache = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes
  }
  
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  async fetchWithCache(url, options = {}, ttl = this.defaultTTL) {
    const cacheKey = `${url}${JSON.stringify(options)}`
    const cached = this.get(cacheKey)
    
    if (cached) return cached
    
    const response = await fetch(url, options)
    const data = await response.json()
    
    this.set(cacheKey, data, ttl)
    return data
  }
}

export default new CacheService()
```

### 🔄 **Pagination Infinie**
```javascript
// infinite-scroll.js - Hook pour pagination infinie
const useInfiniteScroll = (fetchFunction, deps = []) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    try {
      const response = await fetchFunction(page)
      
      if (response.data.length === 0) {
        setHasMore(false)
      } else {
        setData(prev => [...prev, ...response.data])
        setPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchFunction, page, loading, hasMore])
  
  // Reset sur changement de dépendances
  useEffect(() => {
    setData([])
    setPage(1)
    setHasMore(true)
    loadMore()
  }, deps)
  
  return { data, loading, hasMore, loadMore }
}
```

---

## 🚨 GESTION D'ERREURS

### 🛡️ **Intercepteur de Requêtes**
```javascript
// api-client.js - Client API avec gestion d'erreurs
class ApiClient {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL
    this.authService = new AuthService()
  }
  
  async request(endpoint, options = {}) {
    // Renouveler token si nécessaire
    if (this.authService.isAuthenticated()) {
      await this.authService.refreshTokenIfNeeded()
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': localStorage.getItem('language') || 'fr',
        'X-Currency': localStorage.getItem('currency') || 'EUR',
        ...options.headers
      },
      ...options
    }
    
    // Ajouter token d'authentification
    if (this.authService.token) {
      config.headers.Authorization = `Bearer ${this.authService.token}`
    }
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      
      if (!response.ok) {
        await this.handleErrorResponse(response)
      }
      
      return await response.json()
    } catch (error) {
      this.handleNetworkError(error)
      throw error
    }
  }
  
  async handleErrorResponse(response) {
    const error = await response.json()
    
    switch (response.status) {
      case 401:
        // Token invalide, rediriger vers login
        this.authService.logout()
        window.location.href = '/login'
        break
      case 403:
        throw new Error('Accès refusé')
      case 404:
        throw new Error('Ressource non trouvée')
      case 429:
        throw new Error('Trop de requêtes, veuillez patienter')
      case 500:
        throw new Error('Erreur serveur, veuillez réessayer plus tard')
      default:
        throw new Error(error.message || 'Une erreur est survenue')
    }
  }
  
  handleNetworkError(error) {
    if (!navigator.onLine) {
      throw new Error('Pas de connexion internet')
    }
    
    throw new Error('Problème de connexion au serveur')
  }
  
  // Méthodes utilitaires
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

export default new ApiClient()
```

---

## 📱 WEBSOCKETS & TEMPS RÉEL

### 🔔 **Chat en Temps Réel**
```javascript
// socket.js - Service WebSocket
class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
  }
  
  connect() {
    const token = localStorage.getItem('auth_token')
    
    this.socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    
    this.socket.on('connect', () => {
      this.connected = true
      console.log('Connecté au serveur WebSocket')
    })
    
    this.socket.on('disconnect', () => {
      this.connected = false
      console.log('Déconnecté du serveur WebSocket')
    })
    
    // Écouter les notifications
    this.socket.on('notification', (notification) => {
      this.showNotification(notification)
    })
    
    // Écouter les messages de chat
    this.socket.on('chat_message', (message) => {
      this.handleChatMessage(message)
    })
  }
  
  joinTicket(ticketId) {
    if (this.connected) {
      this.socket.emit('join_ticket', ticketId)
    }
  }
  
  sendTicketMessage(ticketId, message) {
    if (this.connected) {
      this.socket.emit('ticket_message', { ticketId, message })
    }
  }
  
  showNotification(notification) {
    // Afficher notification native
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icons/icon-192.png'
      })
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }
}

export default new SocketService()
```

---

## ✅ CHECKLIST INTÉGRATION

### 🔧 **Configuration Initiale**
- [ ] Configurer l'URL de l'API
- [ ] Implémenter le service d'authentification
- [ ] Configurer les intercepteurs de requêtes
- [ ] Mettre en place la gestion d'erreurs globale
- [ ] Configurer le cache frontend

### 👤 **Authentification**
- [ ] Page de connexion
- [ ] Page d'inscription
- [ ] Réinitialisation mot de passe
- [ ] Gestion des tokens (stockage, renouvellement)
- [ ] Déconnexion automatique
- [ ] Activation 2FA

### 🛒 **E-commerce**
- [ ] Liste des produits avec filtres
- [ ] Détails produit avec variants
- [ ] Gestion du panier
- [ ] Processus de commande
- [ ] Intégration paiements
- [ ] Historique des commandes

### 🏪 **Boutiques**
- [ ] Liste des boutiques
- [ ] Profil de boutique
- [ ] Produits par boutique
- [ ] Interface vendeur (si applicable)

### 📱 **Notifications**
- [ ] Enregistrement des tokens push
- [ ] Affichage des notifications
- [ ] Marquer comme lu
- [ ] Notifications natives web

### 🎫 **Support**
- [ ] Création de tickets
- [ ] Liste des tickets
- [ ] Chat en temps réel
- [ ] Upload d'attachments

### 🌍 **Fonctionnalités Avancées**
- [ ] Multi-langues (FR/EN)
- [ ] Multi-devises
- [ ] Mode hors-ligne
- [ ] Progressive Web App (PWA)
- [ ] Analytics frontend

---

Votre backend AfrikMode est **100% prêt** pour l'intégration ! 🎉

Tous les endpoints sont documentés, les services sont opérationnels, et vous avez maintenant tous les exemples de code nécessaires pour développer votre frontend efficacement. 🚀